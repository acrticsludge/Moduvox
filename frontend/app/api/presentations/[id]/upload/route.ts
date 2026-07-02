import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { removeFile, createUploadUrl } from "@/lib/r2"

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

  const r2Key = `pptx/${user.id}/${presentationId}.pptx`

  // Remove any existing file at this path (from previous failed uploads)
  await removeFile(r2Key)

  // Generate a presigned URL for direct browser-to-R2 upload
  const presignedUrl = await createUploadUrl(r2Key, "application/vnd.openxmlformats-officedocument.presentationml.presentation")

  if (!presignedUrl) {
    console.error("Presigned URL error")
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      presignedUrl,
      path: r2Key,
      token: "",
    },
  })
}
