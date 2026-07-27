import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl, createUploadUrl } from "@/lib/r2"
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
  const filePath = body.path as string
  const slideCount = (body.slideCount as number) ?? 1
  if (!filePath) {
    return NextResponse.json({ error: "No file path provided" }, { status: 400 })
  }

  // Verify file type via magic bytes (PPTX/ZIP header: PK\x03\x04)
  const downloadUrl = await createDownloadUrl(filePath, 120)
  if (!downloadUrl) {
    return NextResponse.json({ error: "Failed to verify uploaded file" }, { status: 500 })
  }

  // Check file size via HEAD request
  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  let contentLength: string | null = null
  try {
    const headRes = await fetch(downloadUrl, { method: "HEAD" })
    contentLength = headRes.headers.get("content-length")
  } catch {
    return NextResponse.json({ error: "Could not verify file size" }, { status: 400 })
  }

  if (!contentLength || parseInt(contentLength, 10) <= 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 })
  }

  const size = parseInt(contentLength, 10)
  if (size > MAX_FILE_SIZE) {
    const { deleteFile } = await import("@/lib/r2")
    await deleteFile(filePath)
    return NextResponse.json({
      error: `File too large (${(size / 1024 / 1024).toFixed(1)}MB). Maximum is 100MB.`,
    }, { status: 413 })
  }

  const responseData: { data: { status: string }; warning?: string } = {
    data: { status: "processing" },
  }
  if (size > 50 * 1024 * 1024) {
    responseData.warning = "Large file — may take longer to process"
  }

  let magicBytes: Buffer | null = null
  try {
    const res = await fetch(downloadUrl, {
      headers: { Range: "bytes=0-3" },
    })
    if (res.ok) {
      const arr = await res.arrayBuffer()
      magicBytes = Buffer.from(arr)
    }
  } catch {
    console.error("[Upload] Failed to fetch file for MIME validation")
  }

  if (magicBytes) {
    const validPptxMagic = Buffer.from([0x50, 0x4B, 0x03, 0x04])
    if (!magicBytes.equals(validPptxMagic)) {
      const { deleteFile } = await import("@/lib/r2")
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