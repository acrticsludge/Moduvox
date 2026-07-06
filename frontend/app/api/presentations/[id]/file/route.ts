import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteFile } from "@/lib/r2"

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

  // Remove PPTX from storage
  const filePath = `${user.id}/${presentationId}.pptx`
  await deleteFile(filePath)

  // Reset presentation: clear editor_state, reset status to draft
  const { error: updateError } = await supabase
    .from("presentations")
    .update({
      status: "draft",
      editor_state: {},
      slide_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", presentationId)
    .eq("user_id", user.id)

  if (updateError) {
    console.error("Failed to reset presentation:", updateError.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data: { removed: true } })
}
