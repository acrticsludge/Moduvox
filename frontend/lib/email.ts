import { Resend } from "resend"
import { render } from "@react-email/render"
import { createAdminClient } from "@/lib/supabase/admin"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>"

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

function isServer() {
  return typeof window === "undefined"
}

export async function sendEmail({
  to,
  subject,
  template,
  replyTo,
  auditType,
  auditUserId,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const html = await render(template)

    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
      replyTo: replyTo ?? undefined,
    })

    const status = error ? "failed" : "sent"
    const errMsg = error?.message || undefined

    if (error) {
      console.error("[email] Resend error:", error)
    }

    // Write to audit log (server-side only, best-effort)
    if (auditType && isServer()) {
      try {
        const supabase = createAdminClient()
        await supabase.from("sent_emails").insert({
          user_id: auditUserId || null,
          to_email: to,
          email_type: auditType,
          subject,
          status,
          error_message: errMsg || null,
        })
      } catch (logErr) {
        console.error("[email] Failed to write audit log:", logErr)
      }
    }

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error"
    console.error("[email] send failed:", message)
    return { success: false, error: message }
  }
}
