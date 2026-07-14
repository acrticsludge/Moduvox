import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDownloadUrl, listFiles } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
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

  // Verify viewer session (same pattern as view/[shareToken]/route.ts)
  const { searchParams } = new URL(request.url)
  const sessionToken = searchParams.get("session")
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

  const slideCount = presentation.slide_count || 0

  // Batch: single listFiles call to get all existing PDFs at once (avoids N+1 HEAD requests)
  const pdfPrefix = `${presentation.user_id}/pdf/${presentation.id}/`
  const existingFiles = await listFiles(pdfPrefix)
  const existingKeys = new Set(
    (existingFiles.success ? existingFiles.data.map((f: any) => f.Key) : []) as string[],
  )

  const slides: { slideNumber: number; pdfUrl: string | null }[] = []
  for (let i = 1; i <= slideCount; i++) {
    const key = `${pdfPrefix}slide-${i}.pdf`
    if (existingKeys.has(key)) {
      // createDownloadUrl signs locally (no network call) — safe in loop
      const pdfUrl = await createDownloadUrl(key, 604800) // 7 days
      slides.push({ slideNumber: i, pdfUrl })
    } else {
      slides.push({ slideNumber: i, pdfUrl: null })
    }
  }

  return NextResponse.json({
    data: { slideCount, slides },
  })
})
