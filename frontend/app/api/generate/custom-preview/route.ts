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
    // Never expose internal error details (Gradio response text, URLs, poll
    // internals) to the client — log them server-side and return a safe message.
    const errObj = err && typeof err === "object" ? err as Record<string, unknown> : {}
    const msg = typeof errObj.message === "string" ? errObj.message : ""
    const message = msg.includes("currently busy")
      ? "Voice generation is temporarily unavailable. The HuggingFace Space is busy. Try again in a few minutes."
      : msg.includes("Gradio error")
        ? "Voice generation failed on the HuggingFace Space mid-generation. The public demo is often overloaded — try again in a few minutes."
        : "Voice preview generation failed"
    console.error("[CustomPreview] ERROR:", err instanceof Error ? err.message : JSON.stringify(errObj))
    return NextResponse.json({ error: message }, { status: 503 })
  }
})
