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
  const slideCount = (body.slideCount as number) || 1

  if (!filePath) {
    return NextResponse.json({ error: "No file path provided" }, { status: 400 })
  }

  // Verify file type via magic bytes (PPTX/ZIP header: PK\x03\x04)
  const downloadUrl = await createDownloadUrl(filePath, 120)
  if (!downloadUrl) {
    return NextResponse.json({ error: "Failed to verify uploaded file" }, { status: 500 })
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

  // Update presentation status
  await supabase
    .from("presentations")
    .update({ status: "ready" })
    .eq("id", presentationId)

  // Generate a signed URL for the Office viewer (1 hour)
  const viewerUrl = await createDownloadUrl(filePath, 3600)

  if (!viewerUrl) {
    return NextResponse.json({ error: "Failed to generate viewer URL" }, { status: 500 })
  }

  // ── Fire PDF conversion in background ──
  const workerUrl = process.env.RENDER_WORKER_URL
  const apiKey = process.env.RENDER_WORKER_API_KEY
  if (workerUrl && apiKey) {
    // Derive userId/presentationId from filePath: {userId}/{presentationId}.pptx
    const pathParts = filePath.replace(".pptx", "").split("/")
    if (pathParts.length === 2) {
      const pptxDownloadUrl = await createDownloadUrl(filePath, 3600)
      if (pptxDownloadUrl) {
        const slidePutUrls: Record<string, string> = {}
        for (let i = 1; i <= slideCount; i++) {
          const pdfKey = `${pathParts[0]}/pdf/${pathParts[1]}/slide-${i}.pdf`
          const putUrl = await createUploadUrl(pdfKey, "application/pdf", 3600)
          if (putUrl) slidePutUrls[String(i)] = putUrl
        }
        fetch(`${workerUrl}/convert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ pptxUrl: pptxDownloadUrl, slidePutUrls, slideCount }),
        }).catch((err) => console.error("[upload] PDF conversion trigger failed:", err))
      }
    }
  }

  return NextResponse.json({
    data: { viewerUrl },
  })
})