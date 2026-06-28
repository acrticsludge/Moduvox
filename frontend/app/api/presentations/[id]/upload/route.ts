import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify presentation ownership
  const { data: presentation, error: presentationError } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (presentationError || !presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const admin = createAdminClient()
  const filePath = `${user.id}/${presentationId}.pptx`

  // Remove any existing file at this path (from previous failed uploads)
  await admin.storage.from("presentation-files").remove([filePath])

  // Generate a presigned URL for direct browser-to-Storage upload
  const { data: uploadData, error: uploadError } = await admin.storage
    .from("presentation-files")
    .createSignedUploadUrl(filePath)

  if (uploadError || !uploadData) {
    console.error("Presigned URL error:", uploadError?.message)
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      presignedUrl: uploadData.signedUrl,
      path: filePath,
      token: uploadData.token,
    },
  })
}
