import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateWithPreset } from "@/lib/voxcpm"
import { buildVoiceDescription } from "@/lib/presets"
import { withApiHandler } from "@/lib/api-handler"

const customPreviewSchema = z.object({
  controlInstruction: z.string().min(1, "Control instruction is required").max(500),
  gender: z.enum(["male", "female", "neutral"]).nullable().default(null),
}).strict()

const EXAMPLE_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how your presentation will sound."

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = customPreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { controlInstruction, gender } = parsed.data
  const description = buildVoiceDescription(controlInstruction, gender)

  try {
    const result = await generateWithPreset(EXAMPLE_TEXT, description)

    if (!result.audioUrl) {
      return NextResponse.json({ error: "Generated audio URL is empty" }, { status: 502 })
    }

    // Deliberately NOT cached or stored — this is a one-time audition before the
    // user creates the voice. Creating the voice caches a real preview via
    // generateVoicePreview.
    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate preview"
    console.error("[CustomPreview] ERROR:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
