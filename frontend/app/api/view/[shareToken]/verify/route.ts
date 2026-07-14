import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) => {
  const { shareToken } = await params
  const { searchParams } = new URL(request.url)
  const vt = searchParams.get("vt")

  if (!vt) {
    return NextResponse.json({ error: "Missing verification token" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Find the presentation by share_token
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, expires_at")
    .eq("share_token", shareToken)
    .maybeSingle()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  if (presentation.expires_at && new Date(presentation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This presentation has expired." }, { status: 410 })
  }

  // Find the viewer by session_token
  const { data: viewer } = await supabase
    .from("viewers")
    .select("id, email_verified, presentation_id, verification_sent_at")
    .eq("session_token", vt)
    .eq("presentation_id", presentation.id)
    .maybeSingle()

  if (!viewer) {
    return NextResponse.json({ error: "This verification link has expired or is invalid." }, { status: 404 })
  }

  // If already verified, skip magic link expiry â€” viewer was verified through
  // another path (e.g. gate API created them verified when email gate is disabled)
  if (viewer.email_verified) {
    const origin = new URL(request.url).origin
    return NextResponse.json({
      data: {
        viewer_id: viewer.id,
        session_token: vt,
        redirect_url: `${origin}/view/${shareToken}?session=${vt}`,
      },
    })
  }

  // Enforce 15-minute magic link expiry (only for unverified viewers)
  // Use verification_sent_at (updated on every upsert) instead of created_at
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
  const sentAt = viewer.verification_sent_at ? new Date(viewer.verification_sent_at) : new Date(0)
  if (sentAt < fifteenMinAgo) {
    return NextResponse.json({ error: "This verification link has expired." }, { status: 410 })
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

  // Return redirect info â€” client will store session in sessionStorage and redirect
  return NextResponse.json({
    data: {
      viewer_id: viewer.id,
      session_token: vt,
      redirect_url: `${origin}/view/${shareToken}?session=${vt}`,
    },
  })
})