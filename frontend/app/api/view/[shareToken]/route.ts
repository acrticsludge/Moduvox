import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params

  const supabase = createAdminClient()

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id, title, slide_count, password_hash, expires_at, email_gate_enabled, created_at, status")
    .eq("share_token", shareToken)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Check archived
  if (presentation.status === "archived") {
    return NextResponse.json(
      { error: "This presentation has been archived by its owner." },
      { status: 410 },
    )
  }

  // Check expiration
  if (presentation.expires_at && new Date(presentation.expires_at) < new Date()) {
    return NextResponse.json({ error: "expired", message: "This link has expired" }, { status: 410 })
  }

  // Check if a verified session is provided — skip gate if so
  const { searchParams } = new URL(request.url)
  const sessionToken = searchParams.get("session")
  let sessionVerified = false

  if (sessionToken) {
    const { data: viewer } = await supabase
      .from("viewers")
      .select("id, email_verified")
      .eq("session_token", sessionToken)
      .eq("presentation_id", presentation.id)
      .single()

    if (viewer?.email_verified) {
      sessionVerified = true
    }
  }

  // If email gate is enabled or password is set (and no verified session), return only metadata
  if ((presentation.email_gate_enabled || presentation.password_hash) && !sessionVerified) {
    return NextResponse.json({
      data: {
        id: presentation.id,
        title: presentation.title,
        slide_count: presentation.slide_count || 0,
        has_password: !!presentation.password_hash,
        email_gate_enabled: presentation.email_gate_enabled,
        created_at: presentation.created_at,
      },
    })
  }

  // No gate (or session verified) — return minimal verified response
  return NextResponse.json({
    data: {
      verified: true,
      title: presentation.title,
      created_at: presentation.created_at,
      slide_count: presentation.slide_count || 0,
      expires_at: presentation.expires_at,
    },
  })
}
