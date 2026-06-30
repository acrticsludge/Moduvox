import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { magicLinkGateSchema, passwordGateSchema } from "@/lib/validations/share"
import bcrypt from "bcryptjs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params
  const supabase = await createClient()

  // Look up presentation
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id, title, password_hash, email_gate_enabled")
    .eq("share_token", shareToken)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
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

  // Get IP and user agent
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"

  // Create viewer record (unverified — magic link will verify)
  const { data: viewer, error: insertError } = await supabase
    .from("viewers")
    .insert({
      presentation_id: presentation.id,
      viewer_email: parsed.data.viewer_email,
      viewer_name: parsed.data.viewer_name,
      consent_granted: true,
      email_verified: false,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select("id, session_token, viewer_email, viewer_name")
    .single()

  if (insertError) {
    console.error("Failed to create viewer:", insertError.message)
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
      subject: `Verify your email to watch "${presentation.title}"`,
      text: `Hi ${viewer.viewer_name},\n\nClick this link to verify your email and start watching:\n${verificationUrl}\n\nThis link expires in 15 minutes.\n\n— Moduvox`,
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Moduvox <noreply@moduvox.com>",
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
