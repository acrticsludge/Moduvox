import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch the voice first to check ownership and get sample_path
  const { data: voice, error: fetchError } = await supabase
    .from("voices")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !voice) {
    return NextResponse.json({ error: "Voice not found" }, { status: 404 })
  }

  if (voice.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // If it has a sample file, delete it from Storage
  if (voice.sample_path) {
    const admin = createAdminClient()
    const { error: storageError } = await admin.storage
      .from("voice-samples")
      .remove([voice.sample_path])

    if (storageError) {
      console.error("Failed to delete storage file:", storageError)
      // Continue anyway — don't block voice deletion on storage failure
    }
  }

  const { error: deleteError } = await supabase
    .from("voices")
    .delete()
    .eq("id", id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}
