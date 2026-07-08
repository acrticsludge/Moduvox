import { NextResponse } from "next/server"
import { submitFeedbackSchema, CATEGORY_LABELS } from "@/lib/validations/feedback"
import type { FeedbackCategory } from "@/lib/validations/feedback"

export async function POST(request: Request) {
  try {
    // Parse body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // Validate
    const parsed = submitFeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }

    // Extract IP
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown"

    // Build and send email
    const categoryLabel = CATEGORY_LABELS[parsed.data.category as FeedbackCategory]
    const stars = "★".repeat(parsed.data.rating) + "☆".repeat(5 - parsed.data.rating)
    const email = parsed.data.email || null
    const contactInfo = email
      ? `Email: ${email}\nCan contact: ${parsed.data.can_contact ? "Yes" : "No"}`
      : "Email: Not provided (anonymous)"

    const resendPayload = {
      from: process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>",
      to: ["anubhavrai100@gmail.com"],
      subject: `New feedback: ${categoryLabel} ${stars}`,
      text: [
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
      ].join("\n"),
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error("POST /api/feedback: Resend API error", res.status, text)
      }
    } catch (err) {
      console.error("POST /api/feedback: Failed to send email", err)
    }

    // Always return success — the user's feedback was received even if email fails
    return NextResponse.json({ data: { ok: true } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/feedback: Unexpected error", message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
