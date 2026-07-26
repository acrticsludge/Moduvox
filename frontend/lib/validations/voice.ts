import { z } from "zod"

const genderSchema = z.enum(["male", "female", "neutral"]).optional().nullable()

export const createPresetVoiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.literal("preset"),
  preset_id: z.string().min(1).nullable().default(null),
  control_instruction: z.string().max(500).optional().default(""),
  emotion_default: z.string().default("calm"),
  gender: genderSchema,
})

export const createClonedVoiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.literal("cloned"),
  sample_duration_seconds: z.number().int().positive().optional(),
  emotion_default: z.string().default("calm"),
  gender: genderSchema,
})

export const voiceDeleteSchema = z.object({
  id: z.string().uuid(),
})

export type CreatePresetVoiceInput = z.infer<typeof createPresetVoiceSchema>
export type CreateClonedVoiceInput = z.infer<typeof createClonedVoiceSchema>
