import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { downloadFileAsBuffer } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string; slide: string }> },
) => {
  const { id: presentationId, slide } = await params
  const slideNum = Number(slide)

  if (!Number.isFinite(slideNum) || slideNum < 1) {
    return NextResponse.json({ error: "Invalid slide number" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get the presentation to know the owner's user ID
  const { data: presentation } = await supabase
    .from("presentations")
    .select("user_id")
    .eq("id", presentationId)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Construct the R2 key — matches slides route: ${userId}/pdf/${presId}/slide-${n}.pdf
  const key = `${presentation.user_id}/pdf/${presentationId}/slide-${slideNum}.pdf`

  const result = await downloadFileAsBuffer(key)
  if (!result.success || !result.data) {
    return NextResponse.json({ error: "Slide PDF not found" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="slide-${slideNum}.pdf"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
})
