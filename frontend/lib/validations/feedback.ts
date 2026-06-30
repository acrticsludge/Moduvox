import { z } from "zod"

export const CATEGORIES = ["bug_report", "feature_request", "general"] as const
export type FeedbackCategory = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  general: "General",
}

export const submitFeedbackSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  email: z.string().email("Valid email is required"),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Please select a category" }) }),
  rating: z.number().int().min(1, "Rating is required").max(5),
  message: z.string().min(1, "Message is required").max(5000, "Message must be 5000 characters or less"),
})

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>
