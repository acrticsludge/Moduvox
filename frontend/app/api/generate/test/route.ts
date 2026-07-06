import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateWithPreset, generateWithClone } from "@/lib/voxcpm"
import { createDownloadUrl, downloadFileAsBuffer, uploadFile } from "@/lib/r2"

const testVoiceSchema = z.object({
  voice_id: z.string().uuid("Invalid voice ID"),
}).strict()

const PRESET_VOICE_MAP: Record<string, string> = {
  "calm-female": "A calm, warm female voice. Speaks clearly and steadily.",
  "energetic-male": "An energetic, upbeat male voice. Engaging and lively.",
  "soft-narrator": "A soft, gentle narrator voice. Measured and soothing.",
  "professional-tone": "A clear, authoritative professional voice. Formal and confident.",
  "warm-friendly": "A warm, friendly conversational voice. Approachable and kind.",
}

const EXAMPLE_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how your presentation will sound."

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let parsedBody: { voice_id: string }
  try {
    const body = await request.json()
    const parsed = testVoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
    }
    parsedBody = parsed.data
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { voice_id } = parsedBody

  // Fetch voice, verify ownership
  const { data: voice, error: fetchError } = await supabase
    .from("voices")
    .select("*")
    .eq("id", voice_id)
    .single()

  if (fetchError || !voice) {
    return NextResponse.json({ error: "Voice not found" }, { status: 404 })
  }

  if (voice.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ── Check for cached preview ───────────────────────
  if (voice.preview_audio_path) {
    const audioUrl = await createDownloadUrl(voice.preview_audio_path, 3600)
    if (audioUrl) {
      return NextResponse.json({ data: { audioUrl } })
    }
    // Signed URL failed — fall through to regenerate
  }

  // ── Generate new preview ────────────────────────────
  try {
    let result: Awaited<ReturnType<typeof generateWithPreset>>

    if (voice.type === "preset") {
      const description = voice.preset_id
        ? (PRESET_VOICE_MAP[voice.preset_id] ?? PRESET_VOICE_MAP["calm-female"])
        : PRESET_VOICE_MAP["calm-female"]

      result = await generateWithPreset(EXAMPLE_TEXT, description)
    } else {
      // Cloned voice
      if (!voice.sample_path) {
        return NextResponse.json({ error: "Voice sample not found" }, { status: 400 })
      }

      const sampleResult = await downloadFileAsBuffer(voice.sample_path)
      if (!sampleResult.success) {
        return NextResponse.json({ error: "Voice sample file not found" }, { status: 400 })
      }

      const file = new File([new Uint8Array(sampleResult.data)], "sample.wav", { type: "audio/wav" })
      result = await generateWithClone(EXAMPLE_TEXT, file)
    }

    // Download the generated audio from VoxCPM2's temporary URL (30s timeout)
    const audioRes = await Promise.race([
      fetch(result.audioUrl),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Download timed out after 30s")), 30_000),
      ),
    ])
    if (!audioRes.ok) {
      return NextResponse.json({ data: { audioUrl: result.audioUrl } })
    }

    const audioBuffer = await audioRes.arrayBuffer()

    // Save to R2 for future use
    const previewPath = `${user.id}/previews/${voice_id}.wav`
    const uploadResult = await uploadFile(previewPath, Buffer.from(audioBuffer), "audio/wav")

    if (uploadResult.success) {
      // Update the voice record with the preview path
      await supabase
        .from("voices")
        .update({ preview_audio_path: previewPath })
        .eq("id", voice_id)

      // Return a signed URL for the saved audio
      const audioUrl = await createDownloadUrl(previewPath, 3600)
      if (audioUrl) {
        return NextResponse.json({ data: { audioUrl } })
      }
    }

    // Fallback: return the temporary VoxCPM2 URL
    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Voice preview generation failed"
    console.error("POST /api/generate/test:", msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
