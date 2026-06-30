import type { Resend as ResendType } from "resend"

export interface EmailPayload {
  to: string
  subject: string
  html: string
  replyTo?: string
}

let _resend: ResendType | null = null

function getResend(): ResendType | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require("resend") as { Resend: new (k: string) => ResendType }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Crunchy Bingebite <noreply@bingebite.in>"

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.warn("[notifications/email] RESEND_API_KEY not set — email skipped")
    return
  }
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
    })
  } catch (err) {
    console.error("[notifications/email] send failed:", err)
  }
}
