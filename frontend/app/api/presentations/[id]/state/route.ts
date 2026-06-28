import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

  const body = await request.json()

  // Update slide_count if provided (separate DB column)
  const { slideCount, ...editorState } = body
  const updateData: Record<string, unknown> = { editor_state: editorState }
  if (typeof slideCount === "number") {
    updateData.slide_count = slideCount
  }

  const { error } = await supabase
    .from("presentations")
    .update(updateData)
    .eq("id", presentationId)

  if (error) {
    console.error("Failed to save editor state:", error.message)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ data: { saved: true } })
}
