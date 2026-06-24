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

  try {
    if (voice.type === "preset") {
      const description = voice.preset_id
        ? (PRESET_VOICE_MAP[voice.preset_id] ?? PRESET_VOICE_MAP["calm-female"])
        : PRESET_VOICE_MAP["calm-female"]

      const result = await generateWithPreset(EXAMPLE_TEXT, description)
      return NextResponse.json({ data: { audioUrl: result.audioUrl } })
    }

    // Cloned voice
    if (!voice.sample_path) {
      return NextResponse.json({ error: "Voice sample not found" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: blob } = await admin.storage
      .from("voice-samples")
      .download(voice.sample_path)

    if (!blob) {
      return NextResponse.json({ error: "Voice sample file not found" }, { status: 400 })
    }

    const file = new File([await blob.arrayBuffer()], "sample.wav", { type: "audio/wav" })

    const result = await generateWithClone(EXAMPLE_TEXT, file)
    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice test generation failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
