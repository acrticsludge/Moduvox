import { NextResponse } from "next/server"
import { submitFeedbackSchema, CATEGORY_LABELS } from "@/lib/validations/feedback"
import type { FeedbackCategory } from "@/lib/validations/feedback"
import { withApiHandler } from "@/lib/api-handler"

const COOLDOWN_MS = 12 * 60 * 60 * 1000
const COOKIE_NAME = "feedback_submitted_at"

function getCookie(name: string, header: string | null): string | null {
  if (!header) return null
  for (const part of header.split(";")) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim()
  }
  return null
}

export const POST = withApiHandler(async (request: Request) => {
  try {
    // ── Rate limit check ────────────────────────────────────
    const existing = getCookie(COOKIE_NAME, request.headers.get("cookie"))
    if (existing) {
      const submittedAt = Number(existing)
      if (!isNaN(submittedAt)) {
        const elapsed = Date.now() - submittedAt
        if (elapsed < COOLDOWN_MS) {
          const remainingMs = COOLDOWN_MS - elapsed
          return NextResponse.json(
            { error: "You've already submitted feedback recently.", remainingMs },
            { status: 429 },
          )
        }
      }
    }

    // ── Parse body ──────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // ── Validate ────────────────────────────────────────────
    const parsed = submitFeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }

    // ── reCAPTCHA v3 verification ──────────────────────────
    if (process.env.RECAPTCHA_SECRET_KEY && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const recaptchaToken = body.recaptcha_token as string | undefined
      if (!recaptchaToken) {
        return NextResponse.json({ error: "Security verification failed." }, { status: 403 })
      }
      const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        }),
      })
      const verifyJson = await verifyRes.json()
      if (!verifyJson.success) {
        console.error("reCAPTCHA v3 verification failed:", verifyJson)
        return NextResponse.json({ error: "Security check failed. Please try again." }, { status: 403 })
      }
      if (typeof verifyJson.score === "number" && verifyJson.score < 0.5) {
        console.error("reCAPTCHA v3 low score:", verifyJson.score)
        return NextResponse.json({ error: "Security check failed. Please try again." }, { status: 403 })
      }
    }

    // Extract IP for reference
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown"

    // Build email content
    const categoryLabel = CATEGORY_LABELS[parsed.data.category as FeedbackCategory]
    const stars = "★".repeat(parsed.data.rating) + "☆".repeat(5 - parsed.data.rating)
    const email = parsed.data.email || null
    const contactInfo = email
      ? `Email: ${email}\nCan contact: ${parsed.data.can_contact ? "Yes" : "No"}`
      : "Email: Not provided (anonymous)"

    const text = [
      `New feedback submitted`,
      ``,
      `Category: ${categoryLabel}`,
      `Rating: ${parsed.data.rating}/5`,
      `Name: ${parsed.data.name}`,
      contactInfo,
      ``,
      `Message:`,
      parsed.data.message,
      ``,
      `IP: ${ipAddress}`,
    ].join("\n")

    // ── Send email ──────────────────────────────────────────
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>",
        to: ["anubhavrai100@gmail.com"],
        subject: `New feedback: ${categoryLabel} ${stars}`,
        text,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error("POST /api/feedback: Resend API error", res.status, errText)
      return NextResponse.json(
        { error: "Failed to send feedback. Please try again later." },
        { status: 500 },
      )
    }

    // ── Success — set cooldown cookie (only if consented) ──
    const response = NextResponse.json({ data: { ok: true } }, { status: 201 })
    const cookieConsent = new URL(request.url).searchParams.get("cookie_consent")
    if (cookieConsent !== "true") {
      return response // skip non-essential cookie without consent
    }
    response.cookies.set(COOKIE_NAME, String(Date.now()), {
      maxAge: COOLDOWN_MS / 1000,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    })
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/feedback: Unexpected error", message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
