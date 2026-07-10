import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createProjectSchema, COLOR_PALETTE, ICON_SET } from "@/lib/validations/project"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (request: Request) => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50))
  const offset = (page - 1) * limit

  const query = supabase
    .from("projects")
    .select("id, name, description, color, icon, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error("GET /api/projects:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data, total: count ?? data.length })
})

export const POST = withApiHandler(async (request: Request) => {
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

  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const color = parsed.data.color ?? COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
  const icon = parsed.data.icon ?? ICON_SET[Math.floor(Math.random() * ICON_SET.length)]

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      color,
      icon,
    })
    .select()
    .single()

  if (error) {
    console.error("POST /api/projects:", error.message)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
})
