import { z } from "zod"

export const PRESENTATION_STATUSES = [
  "draft",
  "ready",
  "archived",
] as const

export type PresentationStatus = (typeof PRESENTATION_STATUSES)[number]

export type Presentation = {
  id: string
  project_id: string
  user_id: string
  title: string
  status: PresentationStatus
  slide_count: number
  share_token: string
  password_hash: string | null
  expires_at: string | null
  email_gate_enabled: boolean
  created_at: string
  updated_at: string
}

export const createPresentationSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
})

export type CreatePresentationInput = z.infer<typeof createPresentationSchema>

export const updatePresentationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "ready", "archived"]).optional(),
})

export type UpdatePresentationInput = z.infer<typeof updatePresentationSchema>
