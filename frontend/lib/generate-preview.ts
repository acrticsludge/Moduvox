/**
 * Shared preview audio generation for voices.
 * Called after voice creation to pre-cache preview audio.
 * On failure, the voice is still created — preview is best-effort.
 */

import { generateWithPreset, generateWithClone } from "@/lib/voxcpm"
import { downloadFileAsBuffer, uploadFile, createDownloadUrl, deleteFile } from "@/lib/r2"
import { PRESET_VOICE_MAP } from "@/lib/presets"

const EXAMPLE_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how your presentation will sound."

type VoiceRecord = {
  id: string
  user_id: string
  type: "preset" | "cloned"
  preset_id: string | null
  control_instruction: string | null
  sample_path: string | null
}

/**
 * Generate and cache preview audio for a voice.
 * Runs as fire-and-forget — does not throw on failure.
 */
export async function generateVoicePreview(voice: VoiceRecord): Promise<void> {
  try {
    let result: { audioUrl: string }

    if (voice.type === "preset") {
      const description = voice.control_instruction
        ?? (voice.preset_id ? PRESET_VOICE_MAP[voice.preset_id] : PRESET_VOICE_MAP["calm-female"])
        ?? PRESET_VOICE_MAP["calm-female"]

      result = await generateWithPreset(EXAMPLE_TEXT, description)
    } else {
      if (!voice.sample_path) {
        console.warn(`[generatePreview] No sample_path for cloned voice ${voice.id}`)
        return
      }

      const sampleResult = await downloadFileAsBuffer(voice.sample_path)
      if (!sampleResult.success || !sampleResult.data) {
        console.warn(`[generatePreview] Failed to download sample for voice ${voice.id}`)
        return
      }

      result = await generateWithClone(
        EXAMPLE_TEXT,
        sampleResult.data,
        voice.control_instruction || "",
      )
    }

    if (!result.audioUrl) {
      console.warn(`[generatePreview] Empty audio URL for voice ${voice.id}`)
      return
    }

    // Download generated audio
    const audioRes = await fetch(result.audioUrl)
    if (!audioRes.ok) {
      console.warn(`[generatePreview] Download failed (${audioRes.status}) for voice ${voice.id}`)
      return
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    if (audioBuffer.length === 0) return

    // Upload to R2
    const previewPath = `${voice.user_id}/previews/${voice.id}.wav`
    const uploadResult = await uploadFile(previewPath, audioBuffer, "audio/wav")

    if (uploadResult.success) {
      // Update voice record with preview path (fire-and-forget DB update)
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      await supabase
        .from("voices")
        .update({ preview_audio_path: previewPath })
        .eq("id", voice.id)
    }
  } catch (err) {
    console.warn(`[generatePreview] Failed for voice ${voice.id}:`, err instanceof Error ? err.message : String(err))
    // Preview generation is best-effort — never throw
  }
}

/**
 * Clean up preview audio file when a voice is deleted.
 */
export async function deleteVoicePreview(previewAudioPath: string | null): Promise<void> {
  if (!previewAudioPath) return
  try {
    await deleteFile(previewAudioPath)
  } catch {
    // Best-effort cleanup
  }
}
