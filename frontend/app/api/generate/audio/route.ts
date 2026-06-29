// frontend/app/api/generate/audio/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateAudio, generateWithPreset } from "@/lib/voxcpm"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/ogg"]

const presetAudioSchema = z.object({
  target_text: z.string().min(1, "target_text is required"),
  voice_description: z.string().min(1, "voice_description is required"),
  cfg_value: z.number().min(1).max(3).optional(),
  presentation_id: z.string().uuid().optional(),
}).strict()

async function saveAudioToStorage(
  audioUrl: string,
  userId: string,
  presentationId: string,
): Promise<{ storagePath: string; signedUrl: string }> {
  const admin = createAdminClient()
  const storagePath = `${userId}/audio/${presentationId}.wav`

  // Download audio from Gradio
  const response = await fetch(audioUrl)
  if (!response.ok) throw new Error("Failed to download generated audio")
  const audioBuffer = Buffer.from(await response.arrayBuffer())

  // Remove old audio if exists, then upload
  await admin.storage.from("presentation-files").remove([storagePath]).catch(() => {})
  const { error: uploadError } = await admin.storage
    .from("presentation-files")
    .upload(storagePath, audioBuffer, {
      contentType: "audio/wav",
      upsert: true,
    })

  if (uploadError) throw new Error(`Failed to save audio: ${uploadError.message}`)

  // Generate signed URL (7 day expiry)
  const { data: signed } = await admin.storage
    .from("presentation-files")
    .createSignedUrl(storagePath, 604800) // 7 days

  if (!signed) throw new Error("Failed to generate signed URL")

  return { storagePath, signedUrl: signed.signedUrl }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("multipart/form-data")) {
    // ── Clone mode (with audio file) ─────────────────
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
    }

    const targetText = formData.get("target_text") as string | null
    const audioFile = formData.get("audio") as File | null
    const toneInstructions = formData.get("tone_instructions") as string | null
    const ultimateMode = formData.get("ultimate_mode") === "true"
    const cfgValue = parseFloat(formData.get("cfg_value") as string) || 2.0

    if (!targetText?.trim()) {
      return NextResponse.json({ error: "target_text is required" }, { status: 400 })
    }
    if (!audioFile) {
      return NextResponse.json({ error: "audio file is required for clone mode" }, { status: 400 })
    }
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      return NextResponse.json({ error: "Invalid file type. Accepted: WAV, MP3, M4A, WebM, OGG" }, { status: 400 })
    }

    try {
      const result = await generateAudio({
        targetText: targetText.trim(),
        referenceAudio: audioFile,
        toneInstructions: toneInstructions?.trim() || "",
        ultimateMode,
        cfgValue,
      })
      return NextResponse.json({ data: result })
    } catch (err) {
      console.error("POST /api/generate/audio (clone):", err)
      return NextResponse.json({ error: "Audio generation failed" }, { status: 502 })
    }
  } else {
    // ── Preset / voice-design mode (JSON body) ───────
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = presetAudioSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
    }

    try {
      const result = await generateWithPreset(
        parsed.data.target_text.trim(),
        parsed.data.voice_description.trim(),
        parsed.data.cfg_value ?? 2.0,
      )

      // If presentation_id is provided, save audio to persistent storage
      if (parsed.data.presentation_id) {
        const { storagePath, signedUrl } = await saveAudioToStorage(
          result.audioUrl,
          user.id,
          parsed.data.presentation_id,
        )

        return NextResponse.json({
          data: { audioUrl: signedUrl, storagePath },
        })
      }

      // Fallback: return Gradio URL (no persistence)
      return NextResponse.json({ data: result })
    } catch (err) {
      console.error("POST /api/generate/audio (preset):", err)
      return NextResponse.json({ error: "Audio generation failed" }, { status: 502 })
    }
  }
}
