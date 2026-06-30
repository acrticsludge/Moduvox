import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { magicLinkGateSchema, passwordGateSchema } from "@/lib/validations/share"
import bcrypt from "bcryptjs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params
  const supabase = createAdminClient()

  // Look up presentation
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id, title, password_hash, email_gate_enabled")
    .eq("share_token", shareToken)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Get IP and user agent
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"

  // Rate limit: 5 submissions per IP per hour per presentation
  const { count: recentCount } = await supabase
    .from("viewers")
    .select("id", { count: "exact", head: true })
    .eq("presentation_id", presentation.id)
    .eq("ip_address", ipAddress)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString())

  if (recentCount && recentCount >= 5) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Verify reCAPTCHA v3 token (skip if not configured — dev mode)
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
    // Check score — reject if below 0.5 (likely bot)
    if (typeof verifyJson.score === "number" && verifyJson.score < 0.5) {
      console.error("reCAPTCHA v3 low score:", verifyJson.score)
      return NextResponse.json({ error: "Security check failed. Please try again." }, { status: 403 })
    }
  }

  // Validate email + name + consent (and password if set)
  let password_ok = true
  if (presentation.password_hash) {
    const pwParsed = passwordGateSchema.safeParse(body)
    if (!pwParsed.success) {
      return NextResponse.json({ error: "Password is required to access this presentation." }, { status: 403 })
    }
    password_ok = await bcrypt.compare(pwParsed.data.password, presentation.password_hash)
    if (!password_ok) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 })
    }
  }

  // Validate email + name + consent
  const parsed = magicLinkGateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Upsert viewer — create or update in one shot
  const newSessionToken = crypto.randomUUID()

  const { data: viewer, error: viewerError } = await supabase
    .from("viewers")
    .upsert({
      presentation_id: presentation.id,
      viewer_email: parsed.data.viewer_email,
      viewer_name: parsed.data.viewer_name,
      consent_granted: true,
      email_verified: false,
      session_token: newSessionToken,
      verification_sent_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    }, {
      onConflict: "presentation_id, viewer_email",
      ignoreDuplicates: false,
    })
    .select("id, session_token, viewer_email, viewer_name")
    .single()

  if (viewerError || !viewer) {
    console.error("Failed to create/update viewer:", viewerError?.message)
    return NextResponse.json({ error: "Failed to process gate" }, { status: 500 })
  }

  // Build magic link URL
  const origin = new URL(request.url).origin
  const verificationUrl = `${origin}/view/${shareToken}/verify?vt=${viewer.session_token}`

  // Send magic link email via Resend
  let emailSent = false
  try {
    const resendPayload = {
      to: [viewer.viewer_email],
      subject: "Verify your email to watch this presentation",
      text: `Hi ${viewer.viewer_name},\n\nClick this link to verify your email and start watching:\n${verificationUrl}\n\nThis link expires in 15 minutes.\n\n— Moduvox`,
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>",
        ...resendPayload,
      }),
    })

    if (emailRes.ok) {
      emailSent = true
    } else {
      const errBody = await emailRes.text().catch(() => "unknown")
      console.error("Resend API error:", emailRes.status, errBody)
    }
  } catch (err) {
    console.error("Failed to send magic link email:", err)
  }

  if (!emailSent) {
    return NextResponse.json({
      data: {
        viewer_id: viewer.id,
        viewer_name: viewer.viewer_name,
        viewer_email: viewer.viewer_email,
        email_sent: false,
        message: !process.env.RESEND_API_KEY
          ? "Email service not configured. Contact the presentation owner."
          : "We couldn't send the verification email. Please try again.",
      },
    })
  }

  return NextResponse.json({
    data: {
      viewer_id: viewer.id,
      viewer_name: viewer.viewer_name,
      viewer_email: viewer.viewer_email,
      email_sent: true,
      message: "Check your inbox for the verification link.",
    },
  })
}
