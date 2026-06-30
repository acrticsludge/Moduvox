import { z } from "zod"

export const WAITLIST_INTERESTS = ["pro", "team", "both"] as const
export type WaitlistInterest = (typeof WAITLIST_INTERESTS)[number]

export const submitWaitlistSchema = z.object({
  interest: z.enum(WAITLIST_INTERESTS, {
    message: "Please select Pro, Team, or both",
  }),
})

export type SubmitWaitlistInput = z.infer<typeof submitWaitlistSchema>
