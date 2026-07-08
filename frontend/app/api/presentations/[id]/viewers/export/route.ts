import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
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
    .select("id, title")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const { data: viewers } = await supabase
    .from("viewers")
    .select("viewer_name, viewer_email, progress_pct, time_spent_seconds, email_verified, viewed_at, completed_at, created_at")
    .eq("presentation_id", presentationId)
    .order("created_at", { ascending: false })

  // Build CSV
  const header = "Name,Email,Status,Completion %,Time Spent (min),Email Verified,First Viewed,Completed At,Created At"
  const rows = (viewers || []).map((v) => {
    const status = v.completed_at ? "Completed" : v.viewed_at ? "In Progress" : "Not Viewed"
    const timeMin = v.time_spent_seconds ? (v.time_spent_seconds / 60).toFixed(1) : "0.0"
    const emailVerified = v.email_verified ? "Yes" : "No"
    const viewedAt = v.viewed_at ? new Date(v.viewed_at).toISOString() : ""
    const completedAt = v.completed_at ? new Date(v.completed_at).toISOString() : ""
    const createdAt = v.created_at ? new Date(v.created_at).toISOString() : ""

    // Escape CSV fields that may contain commas or quotes
    const escape = (s: string | null | undefined) => {
      if (!s) return ""
      const str = String(s)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    return [
      escape(v.viewer_name),
      escape(v.viewer_email),
      status,
      (v.progress_pct || 0).toFixed(1),
      timeMin,
      emailVerified,
      viewedAt,
      completedAt,
      createdAt,
    ].join(",")
  })

  const csv = [header, ...rows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${presentation.title.replace(/[^a-zA-Z0-9 _-]/g, "")}-viewers.csv"`,
    },
  })
}
