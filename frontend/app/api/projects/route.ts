import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createProjectSchema, COLOR_PALETTE, ICON_SET } from "@/lib/validations/project"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async () => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("GET /api/projects:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data })
}

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
