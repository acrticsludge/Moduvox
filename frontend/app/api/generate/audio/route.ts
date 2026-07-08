// frontend/app/api/generate/audio/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateAudio, generateWithPreset } from "@/lib/voxcpm"
import { deleteFile, uploadFile, createDownloadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/ogg"]

const slideSchema = z.object({
  number: z.number().int().min(1),
  text: z.string(),
})

const slidesAudioSchema = z.object({
  slides: z.array(slideSchema).min(1),
  voice_description: z.string().min(1, "voice_description is required"),
  cfg_value: z.number().min(1).max(3).optional(),
  presentation_id: z.string().uuid(),
}).strict()

/** Generate, download, and upload per-slide audio to R2. Returns the signed URL. */
async function generateSlideAudio(
  text: string,
  voiceDescription: string,
  cfgValue: number,
  storagePath: string,
): Promise<string> {
  const result = await generateWithPreset(text, voiceDescription, cfgValue)

  // Download from Gradio
  const response = await fetch(result.audioUrl)
  if (!response.ok) throw new Error("Failed to download generated audio")
  const audioBuffer = Buffer.from(await response.arrayBuffer())

  // Upload to R2
  await deleteFile(storagePath)
  const uploadResult = await uploadFile(storagePath, audioBuffer, "audio/wav")
  if (!uploadResult.success) throw new Error(`Failed to save audio: ${uploadResult.error}`)

  // Generate signed URL
  const signedUrl = await createDownloadUrl(storagePath, 604800)
  return signedUrl ?? ""
}

export const POST = withApiHandler(async (request: Request) => {
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
    // ── Preset mode (per-slide JSON) ────────────────
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = slidesAudioSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
    }

    const { slides, voice_description, cfg_value, presentation_id } = parsed.data
    const cfgValue = cfg_value ?? 2.0
    try {
      // Generate per-slide audio in parallel
      const slidePaths = slides.map((s) => ({
        number: s.number,
        storagePath: `${user.id}/audio/${presentation_id}/slides/slide-${s.number}.wav`,
      }))

      await Promise.all(
        slides.map((s, i) =>
          generateSlideAudio(s.text, voice_description, cfgValue, slidePaths[i].storagePath),
        ),
      )

      // Return map of slide number → storage path for the generated slides
      return NextResponse.json({
        data: {
          slidePaths: Object.fromEntries(slidePaths.map((sp) => [sp.number, sp.storagePath])),
          storagePath: `${user.id}/audio/${presentation_id}`, // base dir
        },
      })
    } catch (err) {
      console.error("POST /api/generate/audio (preset):", err)
      return NextResponse.json({ error: "Audio generation failed" }, { status: 502 })
    }
  }
})