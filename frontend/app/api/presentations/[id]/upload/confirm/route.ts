import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl, createUploadUrl, deleteFile, purgePrefix } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const POST = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const filePath = typeof body.path === "string" ? body.path : ""
  if (!filePath) {
    return NextResponse.json({ error: "Missing file path" }, { status: 400 })
  }

  const slideCount = typeof body.slideCount === "number" ? body.slideCount : 1

  // Security: reject path traversal
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  // Verify the path belongs to this user
  const userPrefix = filePath.split("/")[0]
  if (userPrefix !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  // Verify the file exists and check its size via presigned GET download
  // (presigned GET URLs work for GET — not HEAD — so download first bytes to validate)
  const downloadUrl = await createDownloadUrl(filePath, 120)
  if (!downloadUrl) {
    return NextResponse.json({ error: "Failed to verify uploaded file" }, { status: 500 })
  }

  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  let fileSize = 0
  let magicBytes: Buffer | null = null
  try {
    const res = await fetch(downloadUrl, {
      headers: { Range: "bytes=0-4095" }, // first 4KB for magic bytes check
    })
    if (!res.ok) {
      if (res.status === 403) {
        return NextResponse.json({ error: "Uploaded file not accessible" }, { status: 400 })
      }
      return NextResponse.json({ error: "Could not verify uploaded file" }, { status: 400 })
    }
    // Get file size from Content-Range: bytes 0-4095/{totalSize}
    const contentRange = res.headers.get("content-range")
    const contentLen = res.headers.get("content-length")
    fileSize = contentRange ? parseInt(contentRange.split("/")[1], 10) : (contentLen ? parseInt(contentLen, 10) : 0)

    const arr = await res.arrayBuffer()
    magicBytes = Buffer.from(arr.slice(0, 4))
  } catch (err) {
    console.error("[Upload] Failed to fetch file:", err)
    return NextResponse.json({ error: "Could not verify uploaded file" }, { status: 400 })
  }

  if (fileSize <= 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 })
  }
  if (fileSize > MAX_FILE_SIZE) {
    await deleteFile(filePath)
    return NextResponse.json({
      error: `File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum is 100MB.`,
    }, { status: 413 })
  }

  const responseData: { data: { status: string }; warning?: string } = {
    data: { status: "processing" },
  }
  if (fileSize > 50 * 1024 * 1024) {
    responseData.warning = "Large file — may take longer to process"
  }

  if (magicBytes) {
    const validPptxMagic = Buffer.from([0x50, 0x4B, 0x03, 0x04])
    if (!magicBytes.equals(validPptxMagic)) {
      await deleteFile(filePath)
      return NextResponse.json({ error: "Invalid file type. Only .pptx files are allowed." }, { status: 422 })
    }
  }

  // Update presentation status + slide count
  // slide_count MUST be set before pollForPdfs reads it, otherwise the slides API
  // returns completed:true with zero slides and the UI shows "could not be loaded"
  await supabase
    .from("presentations")
    .update({ status: "ready", slide_count: slideCount })
    .eq("id", presentationId)

  // ── Purge the previous deck's per-slide PDFs before conversion ──
  // A re-upload (or upload after "Remove PPT") must REPLACE the old deck, never
  // merge with it. If R2 deletion in the remove step failed silently, stale
  // slide-*.pdf keys from the old deck would survive next to the new deck's
  // PDFs (old + new). Delete the whole pdf/ prefix so the worker starts clean.
  await purgePrefix(`${user.id}/pdf/${presentationId}/`)

  // ── Fire PDF conversion in background ──
  const workerUrl = process.env.RENDER_WORKER_URL
  const apiKey = process.env.RENDER_WORKER_API_KEY

  if (!workerUrl || !apiKey) {
    console.error("[upload] RENDER_WORKER_URL or RENDER_WORKER_API_KEY not set — skipping PDF conversion")
  } else {
    // Derive userId/presentationId from filePath: {userId}/{presentationId}.pptx
    const pathParts = filePath.replace(".pptx", "").split("/")
    if (pathParts.length !== 2) {
      console.error(`[upload] Unexpected filePath format: "${filePath}" — expected {userId}/{presentationId}.pptx`)
    } else {
      console.log(`[upload] Generating presigned URLs for PDF conversion: userId=${pathParts[0]}, presId=${pathParts[1]}, slideCount=${slideCount}`)
      const pptxDownloadUrl = await createDownloadUrl(filePath, 3600)
      if (!pptxDownloadUrl) {
        console.error("[upload] Failed to generate PPTX download URL")
      } else {
        const slidePutUrls: Record<string, string> = {}
        for (let i = 1; i <= slideCount; i++) {
          const pdfKey = `${pathParts[0]}/pdf/${pathParts[1]}/slide-${i}.pdf`
          const putUrl = await createUploadUrl(pdfKey, "application/pdf", 3600)
          if (putUrl) slidePutUrls[String(i)] = putUrl
        }
        console.log(`[upload] Firing worker with ${Object.keys(slidePutUrls).length} slide PUT URLs, slideCount=${slideCount}`)
        fetch(`${workerUrl}/convert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ pptxUrl: pptxDownloadUrl, slidePutUrls, slideCount }),
        })
          .then(async (res) => {
            const body = await res.text()
            if (!res.ok) console.error(`[upload] Worker returned ${res.status}: ${body}`)
            else console.log(`[upload] Worker success: ${body}`)
          })
          .catch((err) => console.error("[upload] PDF conversion trigger failed:", err))
      }
    }
  }

  return NextResponse.json(responseData)
})