import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { downloadFileAsBuffer } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ shareToken: string; slide: string }> },
) => {
  const { shareToken, slide } = await params
  const slideNum = Number(slide)

  if (!Number.isFinite(slideNum) || slideNum < 1) {
    return NextResponse.json({ error: "Invalid slide number" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Look up presentation by share token
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id")
    .eq("share_token", shareToken)
    .maybeSingle()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Verify viewer session for gated presentations
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

  // Construct the R2 key
  const key = `${presentation.user_id}/pdf/${presentation.id}/slide-${slideNum}.pdf`

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
