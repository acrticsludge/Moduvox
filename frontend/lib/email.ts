import { render } from "@react-email/render"
import { createAdminClient } from "@/lib/supabase/admin"

type EmailType = "welcome" | "magic_link" | "feedback_notification"

type SendEmailParams = {
  to: string
  subject: string
  template: React.ReactElement
  replyTo?: string
  /** Type label for the audit log. Omit to skip audit logging. */
  auditType?: EmailType
  /** User ID associated with this email, for audit log tracking. */
  auditUserId?: string
}

type SendEmailResult = {
  success: boolean
  error?: string
}

/**
 * Enqueue an email for background delivery via the worker.
 *
 * Renders the React Email template to HTML, inserts a row into the
 * `email_queue` table, and returns immediately. The Render worker
 * polls the queue every 10s and sends via Resend.
 *
 * Falls back to direct sending (for local dev or when Supabase is
 * unavailable) by importing and calling Resend directly.
 */
export async function sendEmail({
  to,
  subject,
  template,
  auditType,
  auditUserId,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const html = await render(template)

    // Try to enqueue via database (production path)
    const supabase = createAdminClient()
    const { error: queueError } = await supabase.from("email_queue").insert({
      to_email: to,
      subject,
      html,
      email_type: auditType || null,
      audit_user_id: auditUserId || null,
    })

    if (!queueError) {
      return { success: true }
    }

    // Queue insert failed — log and fall through to direct send
    console.error("[email] Queue insert failed, falling back to direct send:", queueError.message)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[email] Template render or queue insert failed:", message)
    // Fall through to direct send
  }

  // ── Fallback: send directly via Resend ──────────────────────
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM = process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>"

    const html = await render(template)
    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error("[email] Direct send error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error"
    console.error("[email] Direct send failed:", message)
    return { success: false, error: message }
  }
}
