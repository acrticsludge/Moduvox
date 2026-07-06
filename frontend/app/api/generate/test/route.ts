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

  console.log("[TestVoice] Voice loaded:", voice.id, voice.type, voice.preset_id, "preview_path:", voice.preview_audio_path)

  // ── Check for cached preview ───────────────────────
  if (voice.preview_audio_path) {
    console.log("[TestVoice] Cached preview exists, generating signed URL...")
    const audioUrl = await createDownloadUrl(voice.preview_audio_path, 3600)
    if (audioUrl) {
      console.log("[TestVoice] Returning cached preview:", audioUrl.slice(0, 80))
      return NextResponse.json({ data: { audioUrl } })
    }
    console.log("[TestVoice] Signed URL failed, will regenerate")
  }

  // ── Generate new preview ────────────────────────────
  try {
    let result: Awaited<ReturnType<typeof generateWithPreset>>

    if (voice.type === "preset") {
      const description = voice.preset_id
        ? (PRESET_VOICE_MAP[voice.preset_id] ?? PRESET_VOICE_MAP["calm-female"])
        : PRESET_VOICE_MAP["calm-female"]

      console.log("[TestVoice] Generating with preset:", voice.preset_id, "→", description.slice(0, 60))
      result = await generateWithPreset(EXAMPLE_TEXT, description)
    } else {
      // Cloned voice
      if (!voice.sample_path) {
        return NextResponse.json({ error: "Voice sample not found" }, { status: 400 })
      }

      console.log("[TestVoice] Downloading sample from R2:", voice.sample_path)
      const sampleResult = await downloadFileAsBuffer(voice.sample_path)
      if (!sampleResult.success) {
        console.log("[TestVoice] R2 download FAILED:", sampleResult.error)
        return NextResponse.json({ error: "Voice sample file not found" }, { status: 400 })
      }

      console.log("[TestVoice] R2 download OK:", sampleResult.data.length, "bytes")
      const file = new File([new Uint8Array(sampleResult.data)], "sample.wav", { type: "audio/wav" })
      console.log("[TestVoice] Generated clone audio via VoxCPM...")
      result = await generateWithClone(EXAMPLE_TEXT, file)
    }

    console.log("[TestVoice] VoxCPM result audioUrl:", result.audioUrl ? result.audioUrl.slice(0, 80) : "EMPTY!")

    if (!result.audioUrl) {
      return NextResponse.json({ error: "Generated audio URL is empty" }, { status: 502 })
    }

    // Download the generated audio from VoxCPM2's temporary URL
    console.log("[TestVoice] Downloading generated audio from:", result.audioUrl.slice(0, 80))
    const audioRes = await Promise.race([
      fetch(result.audioUrl),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Download timed out after 30s")), 30_000),
      ),
    ])

    if (!audioRes.ok) {
      console.log("[TestVoice] Gradio download failed:", audioRes.status, "- returning fallback URL")
      return NextResponse.json({ data: { audioUrl: result.audioUrl } })
    }

    const audioBuffer = await audioRes.arrayBuffer()
    console.log("[TestVoice] Downloaded audio:", audioBuffer.byteLength, "bytes")

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.log("[TestVoice] Downloaded audio is EMPTY!")
      return NextResponse.json({ data: { audioUrl: result.audioUrl } })
    }

    // Save to R2 for future use
    const previewPath = `${user.id}/previews/${voice_id}.wav`
    console.log("[TestVoice] Uploading preview to R2:", previewPath)
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
        console.log("[TestVoice] Return cached preview URL:", audioUrl.slice(0, 80))
        return NextResponse.json({ data: { audioUrl } })
      }
    } else {
      console.log("[TestVoice] R2 upload failed:", uploadResult.error)
    }

    // Fallback: return the temporary VoxCPM2 URL
    console.log("[TestVoice] Falling back to Gradio temp URL")
    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Voice preview generation failed"
    console.error("[TestVoice] ERROR:", msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
