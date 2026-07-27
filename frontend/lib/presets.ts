/**
 * Shared preset voice definitions.
 * Used by both the UI (voices page, create page sidebar) and the API (validation).
 */

export type PresetDefinition = {
  id: string
  label: string
  description: string
  gender: "male" | "female" | "neutral"
  /** Control instruction auto-populated when this preset is selected */
  controlInstruction: string
}

export const PRESET_VOICES: PresetDefinition[] = [
  {
    id: "calm-female",
    label: "Calm Female",
    description: "Warm, steady, reassuring. Ideal for policy and compliance training.",
    gender: "female",
    controlInstruction: "A calm, warm female voice with a steady and reassuring tone. Ideal for policy and compliance training content.",
  },
  {
    id: "energetic-male",
    label: "Energetic Male",
    description: "Upbeat, engaging. Good for onboarding and introductions.",
    gender: "male",
    controlInstruction: "An upbeat, energetic male voice. Good for onboarding, introductions, and motivational content.",
  },
  {
    id: "soft-narrator",
    label: "Soft Narrator",
    description: "Gentle and measured. Fits detailed explanations and tutorials.",
    gender: "neutral",
    controlInstruction: "A gentle, measured voice with a soft delivery. Fits detailed explanations and tutorial-style content.",
  },
  {
    id: "professional-tone",
    label: "Professional Tone",
    description: "Clear, authoritative. Suits formal business content.",
    gender: "neutral",
    controlInstruction: "A clear, authoritative voice with a professional business tone. Suits formal business content.",
  },
  {
    id: "warm-friendly",
    label: "Warm Friendly",
    description: "Approachable, conversational. Makes complex topics feel simple.",
    gender: "neutral",
    controlInstruction: "An approachable, conversational voice that makes complex topics feel simple and accessible.",
  },
]

export const PRESET_VOICE_MAP: Record<string, string> = Object.fromEntries(
  PRESET_VOICES.map((p) => [p.id, p.controlInstruction]),
)

export const GENDER_LABELS: Record<string, string> = {
  male: "a male voice",
  female: "a female voice",
  neutral: "a voice",
}

/** Look up a preset by ID. Returns undefined if not found. */
export function getPreset(id: string): PresetDefinition | undefined {
  return PRESET_VOICES.find((p) => p.id === id)
}
