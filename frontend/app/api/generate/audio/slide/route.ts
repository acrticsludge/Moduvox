import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateWithPreset } from "@/lib/voxcpm"
import { isValidWav, detectFormat } from "@/lib/wav-utils"

const slideSchema = z.object({
  slide_number: z.number().int().min(1),
  text: z.string().min(1),
  voice_description: z.string().min(1, "voice_description is required"),
  cfg_value: z.number().min(1).max(3).optional(),
  presentation_id: z.string().uuid(),
}).strict()

export async function POST(request: Request) {
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

  const { slide_number, text, voice_description, cfg_value, presentation_id } = parsed.data
  const cfgValue = cfg_value ?? 2.0
  const admin = createAdminClient()

  try {
    // Generate audio for this slide
    const result = await generateWithPreset(text, voice_description, cfgValue)

    // Download from Gradio
    const gradioRes = await fetch(result.audioUrl)
    if (!gradioRes.ok) throw new Error("Failed to download generated audio")
    const audioBuffer = Buffer.from(await gradioRes.arrayBuffer())

    if (!isValidWav(audioBuffer)) {
      const format = detectFormat(audioBuffer)
      const contentType = gradioRes.headers.get("content-type") || "unknown"
      throw new Error(
        `Gradio returned ${format} (Content-Type: ${contentType}). ` +
        `Expected audio/wav. The VoxCPM2 space may be down or misconfigured.`,
      )
    }

    // Save to storage
    const storagePath = `${user.id}/audio/${presentation_id}/slides/slide-${slide_number}.wav`
    await admin.storage.from("presentation-files").remove([storagePath]).catch(() => {})
    const { error: uploadError } = await admin.storage
      .from("presentation-files")
      .upload(storagePath, audioBuffer, { contentType: "audio/wav", upsert: true })

    if (uploadError) throw new Error(`Failed to save audio: ${uploadError.message}`)

    return NextResponse.json({ data: { slide_number } })
  } catch (err) {
    console.error(`POST /api/generate/audio/slide (slide ${slide_number}):`, err)
    return NextResponse.json({
      error: `Failed to generate audio for slide ${slide_number}`,
    }, { status: 502 })
  }
}
