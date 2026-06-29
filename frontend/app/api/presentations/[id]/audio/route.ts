import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: presentation } = await supabase
    .from("presentations")
    .select("editor_state")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const editorState = presentation.editor_state as Record<string, unknown> | null
  const storagePath = editorState?.audioStoragePath as string | undefined

  if (!storagePath) {
    return NextResponse.json({ data: { audioUrl: null } })
  }

  const admin = createAdminClient()
  const { data: signed } = await admin.storage
    .from("presentation-files")
    .createSignedUrl(storagePath, 604800) // 7 days

  return NextResponse.json({
    data: { audioUrl: signed?.signedUrl ?? null },
  })
}
