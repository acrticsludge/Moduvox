import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { deleteFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const DELETE = withApiHandler(async () => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // 1. Delete voice samples from R2
    const { data: voices } = await supabase
      .from("voices")
      .select("sample_path, preview_audio_path")
      .eq("user_id", user.id)

    if (voices && voices.length > 0) {
      for (const voice of voices) {
        if (voice.sample_path) await deleteFile(voice.sample_path)
        if (voice.preview_audio_path) await deleteFile(voice.preview_audio_path)
      }
    }

    // 2. Delete user data from tables (cascades handle related records)
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id)

    if (deleteError) {
      console.error("DELETE /api/user/account:", deleteError.message)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    // 3. Delete the auth user (requires admin key)
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id)
    if (authDeleteError) {
      console.error("DELETE /api/user/account (auth):", authDeleteError.message)
    }

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error("DELETE /api/user/account:", err)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
})