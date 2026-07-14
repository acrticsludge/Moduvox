import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAllSlideDurations } from "@/lib/wav-duration"
import { listFiles, createDownloadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) => {
  const { shareToken } = await params

  const supabase = createAdminClient()

  // Fetch presentation with published narration versions
  const { data: presentation } = await supabase
    .from("presentations")
    .select(`
      id, user_id, title, slide_count, password_hash, expires_at, email_gate_enabled, created_at, status, audio_version
    `)
    .eq("share_token", shareToken)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Check published status
  if (presentation.status === "archived") {
    return NextResponse.json(
      { error: "This presentation has been archived by its owner." },
      { status: 410 },
    )
  }

  // Check expiration
  if (presentation.expires_at && new Date(presentation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This presentation link has expired" }, { status: 410 })
  }

  // Check if a verified session is provided — skip gate if so
  const { searchParams } = new URL(request.url)
  const sessionToken = searchParams.get("session")
  let sessionVerified = false
  let viewerData: { id: string; email_verified: boolean; created_at: string; viewed_at: string | null } | null = null

  let viewerCompletedAt: string | null = null
  if (sessionToken) {
    const { data: viewer } = await supabase
      .from("viewers")
      .select("id, email_verified, created_at, viewed_at, completed_at")
      .eq("session_token", sessionToken)
      .eq("presentation_id", presentation.id)
      .single()

    if (viewer?.email_verified) {
      sessionVerified = true
      viewerData = viewer
      viewerCompletedAt = viewer.completed_at
    }
  }

  // Gate status returned to unauthenticated clients intentionally — the gate dialog needs
  // to know whether to show password field.
  if ((presentation.email_gate_enabled || presentation.password_hash) && !sessionVerified) {
    return NextResponse.json({
      data: {
        id: presentation.id,
        title: presentation.title,
        slide_count: presentation.slide_count || 0,
        has_password: !!presentation.password_hash,
        email_gate_enabled: presentation.email_gate_enabled,
        created_at: presentation.created_at,
        audio_version: presentation.audio_version ?? 0,
      },
    })
  }

  // Fetch published narration versions for this presentation
  const { data: narrations } = await supabase
    .from("narration_versions")
    .select("slide_number, narration_text, voice_id, status")
    .eq("presentation_id", presentation.id)
    .eq("status", "published")

  // Build narration map by slide number
  const narrationMap: Record<number, { text: string; voice_id: string | null }> = {}
  if (narrations) {
    for (const n of narrations) {
      narrationMap[n.slide_number] = { text: n.narration_text, voice_id: n.voice_id }
    }
  }

  let totalDurationMs = 0
  let slideTimings: { slideNumber: number; startMs: number; endMs: number }[] = []
  try {
    const timings = await getAllSlideDurations(presentation.user_id, presentation.id, presentation.slide_count || 0)
    totalDurationMs = timings.reduce((sum, t) => sum + t.durationMs, 0)
    let acc = 0
    slideTimings = timings.map((t) => {
      const startMs = acc
      acc += t.durationMs
      return { slideNumber: t.slideNumber, startMs, endMs: acc }
    })
  } catch {
    // non-critical
  }

  // Generate signed URL for cached combined audio in R2
  let audioUrl: string | null = null
  try {
    const audioPrefix = `${presentation.user_id}/audio/${presentation.id}/`
    const combinedKey = `${audioPrefix}combined.wav`
    const existingFiles = await listFiles(audioPrefix)
    if (existingFiles.success && existingFiles.data.some((f) => f.Key === combinedKey)) {
      audioUrl = await createDownloadUrl(combinedKey, 3600)
    }
  } catch (err) {
    console.error("[view route] Failed to list audio files or create download URL:", err)
  }

  return NextResponse.json({
    data: {
      verified: true,
      title: presentation.title,
      presentation_id: presentation.id,
      created_at: presentation.created_at,
      slide_count: presentation.slide_count || 0,
      expires_at: presentation.expires_at,
      total_duration_ms: totalDurationMs,
      audio_url: audioUrl,
      audio_version: presentation.audio_version ?? 0,
      slide_timings: slideTimings,
      viewer_created_at: viewerData ? (viewerData.viewed_at || viewerData.created_at) : null,
      viewer_id: viewerData?.id || null,
      first_watch_done: !!viewerCompletedAt,
      narrations: narrationMap, // published narrations for viewer
    },
  })
})