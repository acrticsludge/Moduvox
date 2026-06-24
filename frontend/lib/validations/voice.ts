import { z } from "zod"

export const createPresetVoiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.literal("preset"),
  preset_id: z.string().min(1),
  emotion_default: z.string().default("calm"),
})

export const createClonedVoiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.literal("cloned"),
  clone_mode: z.enum(["standard", "ultimate"]),
  sample_duration_seconds: z.number().int().positive().optional(),
  emotion_default: z.string().default("calm"),
})

export const voiceDeleteSchema = z.object({
  id: z.string().uuid(),
})

export type CreatePresetVoiceInput = z.infer<typeof createPresetVoiceSchema>
export type CreateClonedVoiceInput = z.infer<typeof createClonedVoiceSchema>
