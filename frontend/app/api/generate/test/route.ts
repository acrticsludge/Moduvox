import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateWithPreset, generateWithClone } from "@/lib/voxcpm"

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

  const body = await request.json()
  const { voice_id } = body as { voice_id?: string }

  if (!voice_id) {
    return NextResponse.json({ error: "voice_id is required" }, { status: 400 })
  }

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
    const admin = createAdminClient()
    const { data: signedData } = await admin.storage
      .from("voice-samples")
      .createSignedUrl(voice.preview_audio_path, 3600)

    if (signedData) {
      return NextResponse.json({ data: { audioUrl: signedData.signedUrl } })
    }
    // Signed URL failed — fall through to regenerate
  }

  // ── Generate new preview ────────────────────────────
  const admin = createAdminClient()

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

      const { data: blob } = await admin.storage
        .from("voice-samples")
        .download(voice.sample_path)

      if (!blob) {
        return NextResponse.json({ error: "Voice sample file not found" }, { status: 400 })
      }

      const file = new File([await blob.arrayBuffer()], "sample.wav", { type: "audio/wav" })
      result = await generateWithClone(EXAMPLE_TEXT, file)
    }

    // Download the generated audio from VoxCPM2's temporary URL
    const audioRes = await fetch(result.audioUrl)
    if (!audioRes.ok) {
      return NextResponse.json({ data: { audioUrl: result.audioUrl } })
    }

    const audioBuffer = await audioRes.arrayBuffer()

    // Save to Supabase Storage for future use
    const previewPath = `${user.id}/previews/${voice_id}.wav`
    const { error: uploadError } = await admin.storage
      .from("voice-samples")
      .upload(previewPath, audioBuffer, {
        contentType: "audio/wav",
        upsert: true,
      })

    if (!uploadError) {
      // Update the voice record with the preview path
      await supabase
        .from("voices")
        .update({ preview_audio_path: previewPath })
        .eq("id", voice_id)

      // Return a signed URL for the saved audio
      const { data: signedData } = await admin.storage
        .from("voice-samples")
        .createSignedUrl(previewPath, 3600)

      if (signedData) {
        return NextResponse.json({ data: { audioUrl: signedData.signedUrl } })
      }
    }

    // Fallback: return the temporary VoxCPM2 URL
    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice test generation failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
