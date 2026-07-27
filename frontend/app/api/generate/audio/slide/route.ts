import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateWithPreset, generateWithClone, splitIntoChunks } from "@/lib/voxcpm"
import { isValidWav, detectFormat, concatWavBuffers } from "@/lib/wav-utils"
import { toWav } from "@/lib/audio-convert"
import { downloadFileAsBuffer, deleteFile, uploadFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"
import { logAuditFromRequest } from "@/lib/audit"

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
    // ── Phase 1: Voice setup (resolve reference audio and description) ──
    let refFile: File | null = null
    let voiceDesc = voice_description || "Natural, clear, professional speaking voice"

    if (voice_id) {
      const { data: voice } = await supabase
        .from("voices")
        .select("type, sample_path, control_instruction, gender")
        .eq("id", voice_id)
        .eq("user_id", user.id)
        .single()

      if (voice?.type === "cloned" && voice.sample_path) {
        const refResult = await downloadFileAsBuffer(voice.sample_path)
        if (refResult.success) {
          refFile = new File([new Uint8Array(refResult.data)], "sample.wav", { type: "audio/wav" })
          // Use the voice's control_instruction (set at clone creation) as tone instructions,
          // falling back to the frontend's voice_description. Without this, VoxCPM2 gets a
          // generic description and produces inconsistent voice characteristics per slide.
          voiceDesc = voice?.control_instruction || voice_description || "Natural, clear, professional speaking voice"
        } else {
          throw new Error("Cloned voice reference audio not found. Please re-upload your voice sample.")
        }
      } else {
        voiceDesc = voice?.control_instruction || voice_description || "Natural, clear, professional speaking voice"
      }
    }

    // ── Phase 2: Chunk narration text and generate audio per chunk ──
    // Long text causes VoxCPM2 to produce screeching artifacts.
    // Chunking at natural boundaries (≤250 chars) keeps each inference manageable,
    // then we seamlessly concatenate the WAVs with no gaps.
    const chunks = splitIntoChunks(text, 250)
    const wavBuffers: Buffer[] = []

    for (const chunk of chunks) {
      let result
      if (refFile) {
        result = await generateWithClone(chunk, refFile, voiceDesc, cfgValue)
      } else {
        result = await generateWithPreset(chunk, voiceDesc, cfgValue)
      }

      // Download from Gradio
      const gradioRes = await fetch(result.audioUrl)
      if (!gradioRes.ok) throw new Error("Failed to download generated audio")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let audioBuffer: any = Buffer.from(await gradioRes.arrayBuffer())

      // VoxCPM2 returns MP3; convert to WAV for consistent processing
      if (!isValidWav(audioBuffer)) {
        const format = detectFormat(audioBuffer)
        console.log(`[chunk] Gradio returned ${format}, converting to WAV...`)
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

      wavBuffers.push(audioBuffer as Buffer)
    }

    // ── Phase 3: Concatenate chunk WAVs into a single slide audio ──
    const finalWav = wavBuffers.length === 1 ? wavBuffers[0] : concatWavBuffers(wavBuffers)

    // ── Phase 4: Save per-slide WAV to R2 ──
    const storagePath = `${user.id}/audio/${presentation_id}/slides/slide-${slide_number}.wav`
    await deleteFile(storagePath)

    const uploadResult = await uploadFile(storagePath, finalWav, "audio/wav")
    if (!uploadResult.success) throw new Error(`Failed to save audio: ${uploadResult.error}`)

    // NOTE: combined.wav is NOT deleted here. It is rebuilt atomically by the
    // editor after ALL per-slide WAVs are written, preventing race conditions
    // where a viewer requests combined audio during partial regeneration.
    // audio_version is also bumped only after combined rebuild completes.

    // Audit log
    await logAuditFromRequest(request, {
      presentation_id,
      slide_number,
      action: 'audio_generated',
      metadata: { voice_id: voice_id ?? null },
    })

    return NextResponse.json({ data: { slide_number } })
  } catch (err) {
    console.error(`POST /api/generate/audio/slide (slide ${slide_number}):`, err)
    return NextResponse.json({
      error: `Failed to generate audio for slide ${slide_number}`,
    }, { status: 502 })
  }
})