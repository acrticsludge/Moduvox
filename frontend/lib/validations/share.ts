import { z } from "zod"

export const updateShareSettingsSchema = z.object({
  email_gate_enabled: z.boolean().optional(),
  password: z.string().min(1).max(128).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
})

const consentCheck = z.boolean().refine((val) => val === true, {
  message: "You must confirm you are watching for yourself",
})

export const emailGateSchema = z.object({
  viewer_name: z.string().min(1, "Name is required").max(200),
  viewer_email: z.string().email("Valid email is required"),
  consent_granted: consentCheck,
})

export const passwordGateSchema = z.object({
  password: z.string().min(1, "Password is required"),
})

export const magicLinkGateSchema = z.object({
  viewer_name: z.string().min(1, "Name is required").max(200),
  viewer_email: z.string().email("Valid email is required"),
  consent_granted: consentCheck,
  password: z.string().optional(),
})

export const trackEventSchema = z.object({
  session_token: z.string().uuid(),
  event_type: z.enum(["opened", "slide_viewed", "completed", "closed"]),
  slide_number: z.number().int().positive().optional(),
  progress_pct: z.number().min(0).max(100).optional(),
  time_spent_seconds: z.number().int().min(0).optional(),
})

export const verifyMagicLinkSchema = z.object({
  vt: z.string().uuid("Invalid verification token"),
})

export type UpdateShareSettingsInput = z.infer<typeof updateShareSettingsSchema>
export type EmailGateInput = z.infer<typeof emailGateSchema>
export type PasswordGateInput = z.infer<typeof passwordGateSchema>
export type MagicLinkGateInput = z.infer<typeof magicLinkGateSchema>
export type TrackEventInput = z.infer<typeof trackEventSchema>
