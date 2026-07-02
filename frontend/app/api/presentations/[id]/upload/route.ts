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
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const admin = createAdminClient()
  const filePath = `${user.id}/${presentationId}.pptx`

  // Remove any existing file at this path
  await admin.storage.from("presentation-files").remove([filePath])

  // Generate presigned URL for direct browser-to-Supabase upload
  const { data: uploadData } = await admin.storage.from("presentation-files").createSignedUploadUrl(filePath)

  if (!uploadData) {
    console.error("Failed to create presigned upload URL")
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
