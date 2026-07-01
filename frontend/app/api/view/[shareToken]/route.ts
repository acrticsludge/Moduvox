import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAllSlideDurations } from "@/lib/wav-duration"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params

  const supabase = createAdminClient()

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id, title, slide_count, editor_state, password_hash, expires_at, email_gate_enabled, created_at, status")
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

  // Parse editor_state for slide data and narrations
  const editorState = presentation.editor_state as Record<string, unknown> | null
  const slideData = (editorState?.slideData as { title: string; bullets: string[] }[]) || []
  const narrations = (editorState?.narrations as Record<number, string>) || {}

  // If email gate is enabled or password is set (and no verified session), return only metadata
  if ((presentation.email_gate_enabled || presentation.password_hash) && !sessionVerified) {
    return NextResponse.json({
      data: {
        id: presentation.id,
        title: presentation.title,
        slide_count: presentation.slide_count || slideData.length,
        has_password: !!presentation.password_hash,
        email_gate_enabled: presentation.email_gate_enabled,
        created_at: presentation.created_at,
      },
    })
  }

  // No gate — return full data with timings
  const slides = slideData.map((s, i) => ({
    number: i + 1,
    title: s.title,
    bullets: s.bullets,
    narration: narrations[i + 1] || "",
  }))

  const userId = presentation.user_id
  const presentationId = presentation.id
  const slideCount = presentation.slide_count || slideData.length

  let timings: { slideNumber: number; durationMs: number }[] = []
  try {
    timings = await getAllSlideDurations(userId, presentationId, slideCount)
  } catch {
    // Timing data is non-critical — proceed without it
  }

  const totalDurationMs = timings.reduce((sum, t) => sum + t.durationMs, 0)

  return NextResponse.json({
    data: {
      id: presentation.id,
      title: presentation.title,
      slide_count: slideCount,
      slides,
      timings,
      total_duration_ms: totalDurationMs,
      combined_audio_url: `/api/presentations/${presentationId}/audio/combined`,
      created_at: presentation.created_at,
    },
  })
}
