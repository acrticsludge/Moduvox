import { Resend } from "resend"
import { render } from "@react-email/render"


const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>"

type SendEmailParams = {
  to: string
  subject: string
  template: React.ReactElement
  replyTo?: string
}

type SendEmailResult = {
  success: boolean
  error?: string
}

export async function sendEmail({
  to,
  subject,
  template,
  replyTo,
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

    if (error) {
      console.error("[email] Resend error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error"
    console.error("[email] send failed:", message)
    return { success: false, error: message }
  }
}
