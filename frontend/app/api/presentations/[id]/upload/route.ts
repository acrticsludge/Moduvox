import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

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

  // Parse multipart form
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 50MB." }, { status: 400 })
  }

  if (!file.name.endsWith(".pptx")) {
    return NextResponse.json({ error: "Invalid file type. Only .pptx accepted." }, { status: 400 })
  }

  // Upload file to Supabase Storage using admin client
  const admin = createAdminClient()
  const filePath = `${user.id}/${presentationId}.pptx`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { data: uploadData, error: uploadError } = await admin.storage
    .from("presentation-files")
    .upload(filePath, buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      upsert: true,
    })

  if (uploadError) {
    console.error("PPTX upload error:", uploadError.message)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }

  // Update presentation with the file path
  const { error: updateError } = await supabase
    .from("presentations")
    .update({ original_pptx_path: filePath })
    .eq("id", presentationId)

  if (updateError) {
    console.error("Presentation update error:", updateError.message)
  }

  // Generate signed URL for the uploaded file
  const { data: signedUrlData } = await admin.storage
    .from("presentation-files")
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  return NextResponse.json(
    {
      data: {
        path: filePath,
        signedUrl: signedUrlData?.signedUrl ?? null,
        size: file.size,
        name: file.name,
      },
    },
    { status: 201 },
  )
}
