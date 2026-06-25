import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
}).strict()

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
