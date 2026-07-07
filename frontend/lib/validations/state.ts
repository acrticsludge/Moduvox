import { z } from "zod"

const narrationSchema = z.object({
  id: z.string(),
  text: z.string(),
  slideNumber: z.number().int().min(0),
  status: z.enum(["idle", "generating", "done", "error"]).optional(),
  audioUrl: z.string().url().optional().nullable(),
})

const slideSchema = z.object({
  slideNumber: z.number().int().min(0).optional(),
  storagePath: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
})

const editorStateSchema = z.object({
  voice: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      type: z.enum(["preset", "clone"]).optional(),
    })
    .optional(),
  slideCount: z.number().int().min(0).optional(),
  narrations: z.array(narrationSchema).optional(),
  slides: z.array(slideSchema).optional(),
  currentSlide: z.number().int().min(0).optional(),
  instructions: z.string().max(2000).optional().nullable(),
}).passthrough() // allow extra fields for forward-compat, but at least validate the known shape

export const saveStateSchema = z.object({
  slideCount: z.number().int().min(0).max(500).optional(),
  // The rest of the body is the editor state
}).passthrough()

export type SaveStateInput = z.infer<typeof saveStateSchema>
