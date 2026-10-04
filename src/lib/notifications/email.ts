import type { Resend as ResendType } from "resend"
import { applyEmailBrand } from "./email-brand"

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

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Crunchy Bingebite <noreply@crunchybingebite.com>"

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

/**
 * Never throws. Resend reports API failures (unverified domain, bad key,
 * validation) as `{ error }` rather than throwing, so both paths are handled.
 * Only the error name/message is logged — never the recipient or email body,
 * which may contain reset links.
 */
export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    console.warn("[notifications/email] RESEND_API_KEY not set — email skipped")
    return { ok: false, error: "not_configured" }
  }
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: await applyEmailBrand(payload.html), // admin-uploaded logo in the header
      replyTo: payload.replyTo,
    })
    if (error) {
      console.error(`[notifications/email] send rejected by Resend: ${error.name} — ${error.message}`)
      return { ok: false, error: error.name }
    }
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    console.error("[notifications/email] send failed:", err instanceof Error ? err.message : "unknown error")
    return { ok: false, error: "exception" }
  }
}
