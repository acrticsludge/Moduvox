import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { submitFeedbackSchema, CATEGORY_LABELS } from "@/lib/validations/feedback"
import type { FeedbackCategory } from "@/lib/validations/feedback"

export async function POST(request: Request) {
  try {
    // Validate env vars early so we get a proper JSON error instead of a crash
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("POST /api/feedback: Missing Supabase env vars")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createAdminClient()

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

    // Rate limit: 1 submission per IP per 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .gte("created_at", twelveHoursAgo)

    if (recentCount && recentCount > 0) {
      return NextResponse.json(
        { error: "You've already submitted feedback recently. Please try again later." },
        { status: 429 },
      )
    }

    // Insert into DB
    const email = parsed.data.email || null
    const { data: feedback, error: insertError } = await supabase
      .from("feedback")
      .insert({
        name: parsed.data.name,
        email: email,
        category: parsed.data.category,
        rating: parsed.data.rating,
        message: parsed.data.message,
        can_contact: parsed.data.can_contact || false,
        ip_address: ipAddress,
      })
      .select("id, created_at")
      .single()

    if (insertError || !feedback) {
      console.error("POST /api/feedback: Insert failed", insertError?.message)
      return NextResponse.json(
        { error: "Failed to save feedback. Please try again later." },
        { status: 500 },
      )
    }

    // Send email notification via Resend
    const categoryLabel = CATEGORY_LABELS[parsed.data.category as FeedbackCategory]
    const stars = "★".repeat(parsed.data.rating) + "☆".repeat(5 - parsed.data.rating)
    const contactInfo = email
      ? `Email: ${email}\nCan contact: ${parsed.data.can_contact ? "Yes" : "No"}`
      : "Email: Not provided (anonymous)"

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>",
          to: ["anubhavrai100@gmail.com"],
          subject: `New feedback: ${categoryLabel} ${stars}`,
          text: `New feedback submitted\n\nCategory: ${categoryLabel}\nRating: ${parsed.data.rating}/5\nName: ${parsed.data.name}\n${contactInfo}\n\nMessage:\n${parsed.data.message}\n\nSubmitted at: ${feedback.created_at}\nIP: ${ipAddress}`,
        }),
      })
    } catch (err) {
      console.error("Failed to send feedback email:", err)
      // Don't fail — feedback is already saved
    }

    return NextResponse.json({ data: { ok: true } }, { status: 201 })
  } catch (err) {
    // Catch-all: any unexpected error returns JSON, never HTML
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/feedback: Unexpected error", message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
