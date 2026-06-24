// frontend/app/api/generate/audio/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAudio, generateWithPreset } from "@/lib/voxcpm"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("multipart/form-data")) {
    // ── Clone mode (with audio file) ─────────────────
    const formData = await request.formData()
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
      const message = err instanceof Error ? err.message : "Audio generation failed"
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } else {
    // ── Preset / voice-design mode (JSON body) ───────
    const body = await request.json()
    const { target_text, voice_description, cfg_value } = body

    if (!target_text?.trim()) {
      return NextResponse.json({ error: "target_text is required" }, { status: 400 })
    }
    if (!voice_description?.trim()) {
      return NextResponse.json({ error: "voice_description is required for preset mode" }, { status: 400 })
    }

    try {
      const result = await generateWithPreset(
        target_text.trim(),
        voice_description.trim(),
        parseFloat(cfg_value) || 2.0,
      )
      return NextResponse.json({ data: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audio generation failed"
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }
}
