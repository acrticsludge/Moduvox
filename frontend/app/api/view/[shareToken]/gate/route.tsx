import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { magicLinkGateSchema, passwordGateSchema } from "@/lib/validations/share"
import bcrypt from "bcryptjs"
import { withApiHandler } from "@/lib/api-handler"
import { sendEmail } from "@/lib/email"
import { MagicLinkEmail } from "@/emails/magic-link"

export const POST = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) => {
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

  // Verify reCAPTCHA v3 token (skip if not configured â€” dev mode)
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
    // Check score â€” reject if below 0.5 (likely bot)
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

  // Email gate disabled â†’ create viewer as verified, skip email, return success
  if (!presentation.email_gate_enabled) {
    // Check if a verified viewer already exists for this email
    const { data: existingVerified } = await supabase
      .from("viewers")
      .select("id, session_token, viewer_email, viewer_name")
      .eq("presentation_id", presentation.id)
      .eq("viewer_email", parsed.data.viewer_email)
      .eq("email_verified", true)
      .maybeSingle()

    if (existingVerified) {
      // Reuse existing session_token so other devices stay connected
      return NextResponse.json({
        data: {
          viewer_id: existingVerified.id,
          viewer_name: parsed.data.viewer_name,
          viewer_email: existingVerified.viewer_email,
          session_token: existingVerified.session_token,
          email_sent: false,
          already_verified: true,
        },
      })
    }

    // No verified viewer exists â€” create a new one
    const newSessionToken = crypto.randomUUID()

    const { data: viewer, error: viewerError } = await supabase
      .from("viewers")
      .upsert({
        presentation_id: presentation.id,
        viewer_email: parsed.data.viewer_email,
        viewer_name: parsed.data.viewer_name,
        consent_granted: true,
        email_verified: true,
        session_token: newSessionToken,
        verification_sent_at: new Date().toISOString(),
        viewed_at: new Date().toISOString(),
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

    return NextResponse.json({
      data: {
        viewer_id: viewer.id,
        viewer_name: viewer.viewer_name,
        viewer_email: viewer.viewer_email,
        session_token: viewer.session_token,
        email_sent: false,
        already_verified: true,
      },
    })
  }

  // Check if viewer already exists and is verified (email-gated flow only)
  const { data: existingViewer } = await supabase
    .from("viewers")
    .select("id, email_verified, session_token")
    .eq("presentation_id", presentation.id)
    .eq("viewer_email", parsed.data.viewer_email)
    .maybeSingle()

  const alreadyVerified = existingViewer?.email_verified === true

  if (alreadyVerified) {
    return NextResponse.json({
      data: {
        viewer_id: existingViewer.id,
        viewer_name: parsed.data.viewer_name,
        viewer_email: parsed.data.viewer_email,
        email_sent: false,
        already_verified: true,
        session_token: existingViewer.session_token,
      },
    })
  }

  // Daily email cap: 20 magic link sends per presentation per 24h
  // Counts viewers with verification_sent_at in the window as a proxy
  // for emails sent (both count and cap set conservatively).
  const { count: dailyEmailCount } = await supabase
    .from("viewers")
    .select("id", { count: "exact", head: true })
    .eq("presentation_id", presentation.id)
    .gte("verification_sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (dailyEmailCount !== null && dailyEmailCount >= 20) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
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
      email_verified: alreadyVerified,
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
  const emailResult = await sendEmail({
    to: viewer.viewer_email,
    subject: `You're invited to view "${presentation.title}"`,
    auditType: "magic_link",
    template: (
      <MagicLinkEmail
        viewerName={viewer.viewer_name}
        verificationUrl={verificationUrl}
        presentationTitle={presentation.title}
      />
    ),
  })

  if (!emailResult.success) {
    // Clean up orphaned viewer record — email never arrived so there's
    // no way for the viewer to verify. The user can retry on the gate form.
    await supabase.from("viewers").delete().eq("id", viewer.id).maybeSingle()

    return NextResponse.json(
      { error: !process.env.RESEND_API_KEY
        ? "Email service not configured."
        : "We couldn't send the verification email. Please try again." },
      { status: 500 },
    )
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
})