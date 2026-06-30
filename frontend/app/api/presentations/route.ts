import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createPresentationSchema } from "@/lib/validations/presentation"
import { checkPresentationQuota, checkDailyPresentationQuota, quotaBlockResponse } from "@/lib/quota"

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createPresentationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Verify the project exists and belongs to the user
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.project_id)
    .eq("user_id", user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Check free tier quotas
  const lifetimeCheck = await checkPresentationQuota(supabase, user.id)
  if (!lifetimeCheck.allowed) {
    return quotaBlockResponse(lifetimeCheck)
  }

  const dailyCheck = await checkDailyPresentationQuota(supabase, user.id)
  if (!dailyCheck.allowed) {
    return quotaBlockResponse(dailyCheck)
  }

  const { data, error } = await supabase
    .from("presentations")
    .insert({
      project_id: parsed.data.project_id,
      user_id: user.id,
      title: parsed.data.title,
      status: "draft",
      slide_count: 0,
    })
    .select()
    .single()

  if (error) {
    console.error("POST /api/presentations:", error.message)
    return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
