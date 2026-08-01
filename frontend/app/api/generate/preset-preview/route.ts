import { NextResponse } from "next/server"
import { z } from "zod"
import { generateWithPreset } from "@/lib/voxcpm"
import { createDownloadUrl, fileExists, uploadFile } from "@/lib/r2"
import { PRESET_VOICE_MAP } from "@/lib/presets"
import { withApiHandler } from "@/lib/api-handler"

const previewSchema = z.object({
  presetId: z.enum(["calm-female", "energetic-male", "soft-narrator", "professional-tone", "warm-friendly"]),
}).strict()

const EXAMPLE_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how this preset voice sounds."

// Shared R2 cache for preset previews. The key is deterministic per preset, so
// any user's first play seeds the cache and every later play (any user) is
// served from R2 without a TTS call. If EXAMPLE_TEXT ever changes, bump this
// prefix (e.g. "preset-previews/v2").
const PRESET_PREVIEW_PREFIX = "preset-previews"

function presetPreviewKey(presetId: string): string {
  return `${PRESET_PREVIEW_PREFIX}/${presetId}.wav`
}

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

  const key = presetPreviewKey(presetId)

  // ── Cache hit: serve from R2 — no TTS call ─────────────
  const exists = await fileExists(key)
  if (exists.success && exists.data) {
    const cachedUrl = await createDownloadUrl(key, 3600)
    if (cachedUrl) {
      return NextResponse.json({ data: { audioUrl: cachedUrl } })
    }
  }

  // ── Cache miss: generate, cache, then serve ────────────
  try {
    const result = await generateWithPreset(EXAMPLE_TEXT, description)

    if (!result.audioUrl) {
      return NextResponse.json({ error: "Generated audio URL is empty" }, { status: 502 })
    }

    // Download the generated audio from VoxCPM2's temporary URL and cache it.
    // Any failure here (download timeout, empty buffer, R2 upload error) falls
    // back to the temp URL — the audio still plays this once.
    try {
      const audioRes = await Promise.race([
        fetch(result.audioUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Download timed out after 30s")), 30_000),
        ),
      ])
      if (!audioRes.ok) throw new Error(`HTTP ${audioRes.status}`)

      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      if (audioBuffer.length === 0) throw new Error("Empty audio buffer")

      const uploadResult = await uploadFile(key, audioBuffer, "audio/wav")
      if (uploadResult.success) {
        const audioUrl = await createDownloadUrl(key, 3600)
        if (audioUrl) {
          return NextResponse.json({ data: { audioUrl } })
        }
      }
    } catch (cacheErr) {
      console.warn(
        "[PresetPreview] Caching failed, using temp URL:",
        cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
      )
    }

    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate preview"
    console.error("[PresetPreview] ERROR:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
