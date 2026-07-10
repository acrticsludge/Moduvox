import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const supabase = await createClient()
    const { id: presentationId } = await params

    // Wrap auth check separately â€” ECONNRESET from Supabase Auth after idle
    let user: { id: string } | null = null
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      user = data.user
    } catch {
      return NextResponse.json({ error: "Session expired. Please refresh." }, { status: 401 })
    }

    // Verify ownership
    const { data: presentation } = await supabase
      .from("presentations")
      .select("id")
      .eq("id", presentationId)
      .eq("user_id", user.id)
      .single()

    if (!presentation) {
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
    }

    // Pagination
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50))
    const offset = (page - 1) * limit

    // Get viewers ordered by most recent first
    const { data: viewers, error, count } = await supabase
      .from("viewers")
      .select("id, viewer_name, viewer_email, email_verified, consent_granted, viewed_at, completed_at, time_spent_seconds, progress_pct, created_at", { count: "exact" })
      .eq("presentation_id", presentationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Failed to fetch viewers:", error.message)
      return NextResponse.json({ error: "Failed to fetch viewers" }, { status: 500 })
    }

    const result = (viewers || []).map((v) => {
      let status: "not_viewed" | "in_progress" | "completed" = "not_viewed"
      if (v.completed_at && (v.time_spent_seconds ?? 0) >= 30) {
        status = "completed"
      } else if (v.viewed_at) {
        status = "in_progress"
      }

      return {
        id: v.id,
        name: v.viewer_name,
        email: v.viewer_email,
        email_verified: v.email_verified,
        consent_granted: v.consent_granted,
        status,
        progress_pct: v.progress_pct || 0,
        time_spent_seconds: v.time_spent_seconds || 0,
        viewed_at: v.viewed_at,
        completed_at: v.completed_at,
        created_at: v.created_at,
      }
    })

    return NextResponse.json({
      data: {
        viewers: result,
        total: count ?? result.length,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to load viewers" }, { status: 500 })
  }
})