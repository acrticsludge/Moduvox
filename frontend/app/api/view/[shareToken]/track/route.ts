import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { trackEventSchema } from "@/lib/validations/share"

// Simple in-memory rate limiter: 100 req/min per presentation
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(presentationId: string): boolean {
  const now = Date.now()
  const key = `track:${presentationId}`
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 100) {
    return false
  }

  entry.count++
  return true
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params
  const supabase = createAdminClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = trackEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Find presentation by share_token
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("share_token", shareToken)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Rate limit
  if (!checkRateLimit(presentation.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  // Validate session_token matches a viewer
  const { data: viewer } = await supabase
    .from("viewers")
    .select("id, viewed_at")
    .eq("session_token", parsed.data.session_token)
    .eq("presentation_id", presentation.id)
    .eq("email_verified", true)
    .single()

  if (!viewer) {
    return NextResponse.json({ error: "Invalid session" }, { status: 403 })
  }

  // Get IP and user agent
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"

  // Insert event
  const { error: insertError } = await supabase
    .from("viewer_events")
    .insert({
      presentation_id: presentation.id,
      viewer_id: viewer.id,
      event_type: parsed.data.event_type,
      slide_number: parsed.data.slide_number || null,
      progress_pct: parsed.data.progress_pct || null,
      time_spent_seconds: parsed.data.time_spent_seconds || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

  if (insertError) {
    console.error("Failed to track event:", insertError.message)
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 })
  }

  // Update viewer aggregate fields for certain event types
  const viewerUpdates: Record<string, unknown> = {}

  if (parsed.data.event_type === "opened" && !viewer.viewed_at) {
    viewerUpdates.viewed_at = new Date().toISOString()
  }

  if (parsed.data.event_type === "completed") {
    viewerUpdates.completed_at = new Date().toISOString()
    viewerUpdates.progress_pct = 100
  }

  if (parsed.data.progress_pct !== undefined && parsed.data.progress_pct > 0) {
    viewerUpdates.progress_pct = parsed.data.progress_pct
  }

  if (parsed.data.time_spent_seconds !== undefined) {
    viewerUpdates.time_spent_seconds = parsed.data.time_spent_seconds
  }

  if (Object.keys(viewerUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from("viewers")
      .update(viewerUpdates)
      .eq("id", viewer.id)

    if (updateError) {
      console.error("Failed to update viewer aggregates:", updateError.message)
    }
  }

  return NextResponse.json({ data: { ok: true } })
}
