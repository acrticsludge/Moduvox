import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params
  const { searchParams } = new URL(request.url)
  const vt = searchParams.get("vt")

  if (!vt) {
    return NextResponse.json({ error: "Missing verification token" }, { status: 400 })
  }

  const supabase = await createClient()

  // Find the presentation by share_token
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("share_token", shareToken)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "invalid_link", message: "This link is invalid." }, { status: 404 })
  }

  // Find the viewer by session_token
  const { data: viewer } = await supabase
    .from("viewers")
    .select("id, email_verified, presentation_id")
    .eq("session_token", vt)
    .eq("presentation_id", presentation.id)
    .single()

  if (!viewer) {
    return NextResponse.json({ error: "invalid_link", message: "This verification link has expired or is invalid." }, { status: 404 })
  }

  if (viewer.email_verified) {
    // Already verified — return success with existing viewer info
    const origin = new URL(request.url).origin
    return NextResponse.json({
      data: {
        viewer_id: viewer.id,
        session_token: vt,
        redirect_url: `${origin}/view/${shareToken}?session=${vt}`,
      },
    })
  }

  // Mark as verified
  const { error: updateError } = await supabase
    .from("viewers")
    .update({
      email_verified: true,
      viewed_at: new Date().toISOString(),
    })
    .eq("id", viewer.id)

  if (updateError) {
    console.error("Failed to verify viewer:", updateError.message)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }

  const origin = new URL(request.url).origin

  // Return redirect info — client will store session in sessionStorage and redirect
  return NextResponse.json({
    data: {
      viewer_id: viewer.id,
      session_token: vt,
      redirect_url: `${origin}/view/${shareToken}?session=${vt}`,
    },
  })
}
