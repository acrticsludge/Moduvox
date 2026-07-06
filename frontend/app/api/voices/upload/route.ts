import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkVoiceCloneQuota, quotaBlockResponse } from "@/lib/quota"
import { createUploadUrl } from "@/lib/r2"

const ALLOWED_EXTENSIONS = ["wav", "mp3", "mp4", "m4a", "webm", "ogg"]

/**
 * Returns a presigned PUT URL for direct browser-to-R2 upload.
 * The client then uploads the file to this URL and calls /api/voices/upload/confirm.
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { name?: string; emotion_default?: string; file_ext?: string; file_type?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const name = body.name?.trim()
  const fileExt = body.file_ext?.toLowerCase()
  const fileType = body.file_type
  const emotionDefault = body.emotion_default ?? "calm"

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    return NextResponse.json({ error: "Invalid file type. Accepted: WAV, MP3, M4A, WebM, OGG" }, { status: 400 })
  }

  // Check free tier voice clone quota
  const cloneCheck = await checkVoiceCloneQuota(supabase, user.id)
  if (!cloneCheck.allowed) {
    return quotaBlockResponse(cloneCheck)
  }

  const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`
  const presignedUrl = await createUploadUrl(filePath, fileType || "audio/wav", 3600)

  if (!presignedUrl) {
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      presignedUrl,
      path: filePath,
    },
  })
}
