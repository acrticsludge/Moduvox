import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateProjectSchema } from "@/lib/validations/project"
import { withApiHandler } from "@/lib/api-handler"

export const PATCH = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id } = await params

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

  const parsed = updateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.color !== undefined) updates.color = parsed.data.color
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    console.error("PATCH /api/projects/[id]:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ data })
})

export const DELETE = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    console.error("DELETE /api/projects/[id]:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ data: { id } })
})