import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateWithPreset, generateWithClone } from "@/lib/voxcpm"
import { isValidWav, detectFormat } from "@/lib/wav-utils"
import { toWav } from "@/lib/audio-convert"
import { downloadFileAsBuffer, deleteFile, uploadFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

const slideSchema = z.object({
  slide_number: z.number().int().min(1),
  text: z.string().min(1),
  voice_description: z.string().default(""),
  cfg_value: z.number().min(1).max(3).optional(),
  presentation_id: z.string().uuid(),
  voice_id: z.string().uuid().optional(),
}).strict()

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = slideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { slide_number, text, voice_description, cfg_value, presentation_id, voice_id } = parsed.data
  const cfgValue = cfg_value ?? 2.0

  try {
    let result

    if (voice_id) {
      // ── Cloned voice mode — look up the voice and use reference audio ──
      const { data: voice } = await supabase
        .from("voices")
        .select("type, sample_path, control_instruction")
        .eq("id", voice_id)
        .eq("user_id", user.id)
        .single()

      if (voice?.type === "cloned" && voice.sample_path) {
        // Download reference audio from R2
        const refResult = await downloadFileAsBuffer(voice.sample_path)
        if (refResult.success) {
          const refFile = new File([new Uint8Array(refResult.data)], "sample.wav", { type: "audio/wav" })
          result = await generateWithClone(text, refFile, voice_description || "", cfgValue)
        } else {
          throw new Error(`Cloned voice reference audio not found. Please re-upload your voice sample.`)
        }
      } else {
        // Preset voice — use control_instruction as voice description
        const desc = voice?.control_instruction || voice_description || "Natural, clear, professional speaking voice"
        result = await generateWithPreset(text, desc, cfgValue)
      }
    } else {
      // ── No voice_id — use preset mode with voice_description ──
      result = await generateWithPreset(text, voice_description || "Natural, clear, professional speaking voice", cfgValue)
    }

    // Download from Gradio
    const gradioRes = await fetch(result.audioUrl)
    if (!gradioRes.ok) throw new Error("Failed to download generated audio")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let audioBuffer: any = Buffer.from(await gradioRes.arrayBuffer())

    // VoxCPM2 returns MP3; convert to WAV for consistent processing
    if (!isValidWav(audioBuffer)) {
      const format = detectFormat(audioBuffer)
      console.log(`Gradio returned ${format}, converting to WAV...`)
      const wavBuffer = await toWav(audioBuffer)
      if (isValidWav(wavBuffer)) {
        audioBuffer = wavBuffer
      } else {
        const contentType = gradioRes.headers.get("content-type") || "unknown"
        throw new Error(
          `Gradio returned ${format} (Content-Type: ${contentType}) and ` +
          `conversion to WAV failed.`,
        )
      }
    }

    // Save to R2
    const storagePath = `${user.id}/audio/${presentation_id}/slides/slide-${slide_number}.wav`
    await deleteFile(storagePath)
    const uploadResult = await uploadFile(storagePath, audioBuffer, "audio/wav")
    if (!uploadResult.success) throw new Error(`Failed to save audio: ${uploadResult.error}`)

    // Invalidate the combined audio cache so it gets rebuilt from fresh per-slide WAVs
    const combinedKey = `${user.id}/audio/${presentation_id}/combined.wav`
    await deleteFile(combinedKey).catch(() => {})

    // Bump audio_version so the view page can detect the change
    try {
      const admin = createAdminClient()
      await admin.rpc("increment_audio_version", { p_presentation_id: presentation_id })
    } catch (err) {
      console.error("Failed to bump audio_version:", err)
    }

    return NextResponse.json({ data: { slide_number } })
  } catch (err) {
    console.error(`POST /api/generate/audio/slide (slide ${slide_number}):`, err)
    return NextResponse.json({
      error: `Failed to generate audio for slide ${slide_number}`,
    }, { status: 502 })
  }
})