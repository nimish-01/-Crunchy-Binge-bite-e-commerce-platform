import { NextRequest, NextResponse, after } from "next/server"
import { otpRequestSchema } from "@/lib/validations/auth"
import { requestLoginOtp, OTP_TTL_MINUTES, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/services/email-otp"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const GENERIC_MESSAGE = "If an account exists for this email, we've sent a verification code."

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const parsed = otpRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  if (!rateLimit(`otp-request:${getClientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  const { email } = parsed.data

  // Lookup + email happen after responding, so the response (body, status and
  // timing) is identical whether or not the account exists or is a customer.
  // Per-account cooldown and limits are enforced silently inside the service.
  after(async () => {
    try {
      await requestLoginOtp(email)
    } catch (err) {
      console.error("[POST /api/auth/otp/request]", err instanceof Error ? err.message : "unknown error")
    }
  })

  return NextResponse.json({
    success: true,
    message: GENERIC_MESSAGE,
    expiresInSeconds: OTP_TTL_MINUTES * 60,
    resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  })
}
