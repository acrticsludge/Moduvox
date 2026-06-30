import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkVoiceCloneQuota, quotaBlockResponse } from "@/lib/quota"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/ogg"]

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse multipart form
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const name = formData.get("name") as string | null
  const emotionDefault = formData.get("emotion_default") as string | "calm"

  if (!file) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Accepted: WAV, MP3, M4A, WebM, OGG" }, { status: 400 })
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  // Check free tier voice clone quota
  const cloneCheck = await checkVoiceCloneQuota(supabase, user.id)
  if (!cloneCheck.allowed) {
    return quotaBlockResponse(cloneCheck)
  }

  // Upload file to Supabase Storage using admin client
  const admin = createAdminClient()
  const fileExt = file.name.split(".").pop() ?? "wav"
  const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { data: uploadData, error: uploadError } = await admin.storage
    .from("voice-samples")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }

  // Create voice record using user-scoped client (RLS handles user_id)
  const { data: voice, error: dbError } = await supabase
    .from("voices")
    .insert({
      user_id: user.id,
      name: name.trim(),
      type: "cloned",
      sample_path: filePath,
      sample_duration_seconds: null,
      emotion_default: emotionDefault ?? "calm",
    })
    .select()
    .single()

  if (dbError) {
    console.error("POST /api/voices/upload:", dbError.message)
    // Clean up uploaded file if DB insert fails
    await admin.storage.from("voice-samples").remove([filePath])
    return NextResponse.json({ error: "Failed to save voice" }, { status: 500 })
  }

  return NextResponse.json({ data: voice }, { status: 201 })
}
