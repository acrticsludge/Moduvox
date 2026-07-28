import { NextResponse } from "next/server"
import { z } from "zod"
import { generateWithPreset } from "@/lib/voxcpm"
import { createDownloadUrl, uploadFile } from "@/lib/r2"
import { PRESET_VOICE_MAP } from "@/lib/presets"
import { withApiHandler } from "@/lib/api-handler"

const previewSchema = z.object({
  presetId: z.enum(["calm-female", "energetic-male", "soft-narrator", "professional-tone", "warm-friendly"]),
}).strict()

const EXAMPLE_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how this preset voice sounds."

export const POST = withApiHandler(async (request: Request) => {
  const body = await request.json()
  const parsed = previewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { presetId } = parsed.data
  const description = PRESET_VOICE_MAP[presetId]
  if (!description) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 })
  }

  try {
    const result = await generateWithPreset(EXAMPLE_TEXT, description)

    if (!result.audioUrl) {
      return NextResponse.json({ error: "Generated audio URL is empty" }, { status: 502 })
    }

    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate preview"
    console.error("[PresetPreview] ERROR:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
