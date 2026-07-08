import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

/**
 * Called after the browser uploads a voice sample to R2 via presigned URL.
 * Creates the voice record in the database.
 */
export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { path?: string; name?: string; emotion_default?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { path: filePath, name, emotion_default: emotionDefault } = body

  if (!filePath || !name?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Create voice record
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
    console.error("POST /api/voices/upload/confirm:", dbError.message)
    await deleteFile(filePath)
    return NextResponse.json({ error: "Failed to save voice" }, { status: 500 })
  }

  return NextResponse.json({ data: voice }, { status: 201 })
}
