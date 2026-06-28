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
