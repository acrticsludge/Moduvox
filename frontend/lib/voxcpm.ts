// frontend/lib/voxcpm.ts
import { Client, FileData } from "@gradio/client"

const DEFAULT_SPACE_ID = process.env.VOXCPM2_SPACE_ID || "openbmb/VoxCPM-Demo"

export type VoxCPMInput = {
  /** The narration text to synthesize */
  targetText: string
  /** Reference audio file (null for preset/voice-design mode) */
  referenceAudio?: File | null
  /** For Standard mode: tone/style instructions passed as control_instruction */
  toneInstructions?: string
  /** Ultimate cloning mode — preserves every nuance, disables toneInstructions */
  ultimateMode?: boolean
  /** Transcript of reference audio (auto-filled by ASR in ultimate mode) */
  promptText?: string
  /** CFG guidance scale 1.0–3.0 (default 2.0). Higher = closer to reference. */
  cfgValue?: number
  /** Apply text normalization (default true) */
  normalize?: boolean
  /** Denoise reference audio before cloning (default false) */
  refDenoise?: boolean
}

export type VoxCPMResult = {
  /** URL to the generated audio file (hosted on HF Space, temporary) */
  audioUrl: string
  /** The raw FileData from Gradio response */
  fileData: FileData
}

/**
 * Generate audio using VoxCPM2 via the HuggingFace Gradio Space.
 *
 * Three modes based on inputs:
 * 1. Voice Design (preset) — no referenceAudio, uses toneInstructions as voice description
 * 2. Controllable Cloning (Standard) — referenceAudio + optional toneInstructions
 * 3. Ultimate Cloning — referenceAudio + ultimateMode=true (toneInstructions ignored)
 */
export async function generateAudio(input: VoxCPMInput): Promise<VoxCPMResult> {
  const {
    targetText,
    referenceAudio = null,
    toneInstructions = "",
    ultimateMode = false,
    promptText = "",
    cfgValue = 2.0,
    normalize = true,
    refDenoise = false,
  } = input

  const client = await Client.connect(DEFAULT_SPACE_ID)

  const result = await client.predict("/generate", {
    target_text: targetText,
    control_instruction: ultimateMode ? "" : toneInstructions,
    reference_audio: referenceAudio,
    ultimate_cloning_mode: ultimateMode,
    prompt_text: promptText,
    cfg_value: cfgValue,
    normalize: normalize,
    ref_denoise: refDenoise,
  })

  const data = result.data as FileData[]
  const fileData = data[0]

  return {
    audioUrl: fileData.url ?? "",
    fileData,
  }
}

/**
 * Generate audio using a preset voice description (Voice Design mode).
 * No reference audio needed — VoxCPM2 creates a voice from the description.
 */
export async function generateWithPreset(
  targetText: string,
  voiceDescription: string,
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({
    targetText,
    toneInstructions: voiceDescription,
    cfgValue,
  })
}

/**
 * Generate audio with a cloned voice + optional tone instructions (Standard mode).
 */
export async function generateWithClone(
  targetText: string,
  referenceAudio: File,
  toneInstructions = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({
    targetText,
    referenceAudio,
    toneInstructions,
    cfgValue,
    ultimateMode: false,
  })
}

/**
 * Generate audio in Ultimate Cloning mode.
 * Preserves every nuance of the reference. toneInstructions are ignored by VoxCPM2.
 */
export async function generateUltimateClone(
  targetText: string,
  referenceAudio: File,
  promptText = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({
    targetText,
    referenceAudio,
    ultimateMode: true,
    promptText,
    cfgValue,
  })
}
