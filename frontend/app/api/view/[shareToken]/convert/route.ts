import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDownloadUrl, createUploadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const POST = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) => {
  const { shareToken } = await params
  const supabase = createAdminClient()

  // Look up presentation
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id, slide_count")
    .eq("share_token", shareToken)
    .maybeSingle()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Verify viewer session
  const body = await request.json()
  if (typeof body.sessionToken !== "string") {
    return NextResponse.json({ error: "Invalid session token" }, { status: 400 })
  }
  const sessionToken = body.sessionToken as string
  const { data: viewer } = await supabase
    .from("viewers")
    .select("id")
    .eq("session_token", sessionToken)
    .eq("presentation_id", presentation.id)
    .eq("email_verified", true)
    .maybeSingle()

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Generate presigned URLs
  const pptxKey = `${presentation.user_id}/${presentation.id}.pptx`
  const pptxUrl = await createDownloadUrl(pptxKey, 3600)
  if (!pptxUrl) {
    return NextResponse.json({ error: "Failed to generate PPTX download URL" }, { status: 500 })
  }

  const slideCount = presentation.slide_count || 0
  const slidePutUrls: Record<string, string> = {}
  for (let i = 1; i <= slideCount; i++) {
    const pdfKey = `${presentation.user_id}/pdf/${presentation.id}/slide-${i}.pdf`
    const putUrl = await createUploadUrl(pdfKey, "application/pdf", 3600)
    if (putUrl) {
      slidePutUrls[String(i)] = putUrl
    } else {
      console.warn(`[convert] Failed to create upload URL for slide ${i}`)
    }
  }

  // Fire-and-forget to Render worker
  const workerUrl = process.env.RENDER_WORKER_URL
  const apiKey = process.env.RENDER_WORKER_API_KEY
  if (!workerUrl || !apiKey) {
    return NextResponse.json({ error: "PDF converter not configured" }, { status: 500 })
  }

  const workerRes = await fetch(`${workerUrl}/convert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ pptxUrl, slidePutUrls, slideCount }),
  })
  const workerBody = await workerRes.text()

  return NextResponse.json({
    data: {
      success: true,
      workerStatus: workerRes.ok ? "accepted" : "failed",
      workerError: workerRes.ok ? null : workerBody,
    },
  })
})
