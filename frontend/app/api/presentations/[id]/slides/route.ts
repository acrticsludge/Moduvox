import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl, listFiles } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify ownership
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id, slide_count")
    .eq("id", presentationId)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  if (presentation.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const slideCount = presentation.slide_count || 0

  // List all PDFs for this presentation
  const pdfPrefix = `${user.id}/pdf/${presentationId}/`
  const existingFiles = await listFiles(pdfPrefix)
  const existingKeys = new Set(
    (existingFiles.success ? existingFiles.data.map((f: any) => f.Key) : []) as string[],
  )

  const slides: { slideNumber: number; pdfUrl: string | null }[] = []
  let completedCount = 0

  for (let i = 1; i <= slideCount; i++) {
    const key = `${pdfPrefix}slide-${i}.pdf`
    if (existingKeys.has(key)) {
      const pdfUrl = await createDownloadUrl(key, 3600) // 1 hour
      slides.push({ slideNumber: i, pdfUrl })
      completedCount++
    } else {
      slides.push({ slideNumber: i, pdfUrl: null })
    }
  }

  return NextResponse.json({
    data: {
      slideCount,
      slides,
      completed: completedCount === slideCount,
      convertedCount: completedCount,
    },
  })
})
