import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { updatePresentationSchema } from "@/lib/validations/presentation"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { id: presentationId } = await params

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

  const parsed = updatePresentationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Fetch current record for status transition logic
  let currentStatus = "draft"
  let previousStatus: string | null = null
  try {
    const { data: rec } = await supabase
      .from("presentations")
      .select("status, previous_status")
      .eq("id", presentationId)
      .eq("user_id", user.id)
      .single()
    if (rec) {
      currentStatus = rec.status
      previousStatus = (rec as Record<string, unknown>).previous_status as string | null
    }
  } catch {
    // previous_status column may not exist yet (pre-migration) — fall back gracefully
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status

    // Save previous status when archiving
    if (parsed.data.status === "archived" && currentStatus !== "archived") {
      updates.previous_status = currentStatus
    }

    // Restore to previous status when un-archiving
    if (currentStatus === "archived" && parsed.data.status !== "archived") {
      updates.status = previousStatus || parsed.data.status
      updates.previous_status = null
    }
  }

  const { data, error } = await supabase
    .from("presentations")
    .update(updates)
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    console.error("PATCH /api/presentations/[id]:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify ownership and get storage path
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, editor_state")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Clean up PPTX from storage if it exists
  const filePath = `${user.id}/${presentationId}.pptx`
  const admin = createAdminClient()
  const { error: storageError } = await admin.storage
    .from("presentation-files")
    .remove([filePath])

  if (storageError) {
    console.warn("Failed to remove storage file (may not exist):", storageError.message)
  }

  // Delete the DB record
  const { error } = await supabase
    .from("presentations")
    .delete()
    .eq("id", presentationId)
    .eq("user_id", user.id)

  if (error) {
    console.error("DELETE /api/presentations/[id]:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data: { id: presentationId } })
}
