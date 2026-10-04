import { NextRequest, NextResponse, after } from "next/server"
import { forgotPasswordSchema } from "@/lib/validations/auth"
import { requestPasswordReset } from "@/lib/services/password-reset"
import { getAppOrigin } from "@/lib/app-url"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const GENERIC_MESSAGE = "If an account exists for this email, we've sent a password reset link."

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  if (!rateLimit(`forgot-password:${getClientIp(req)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  const { email } = parsed.data
  const origin = getAppOrigin(req.nextUrl.origin)

  // Do the lookup + email after responding, so response time is identical
  // whether or not the account exists (prevents timing-based enumeration).
  after(async () => {
    try {
      await requestPasswordReset(email, origin)
    } catch (err) {
      console.error("[POST /api/auth/forgot-password]", err instanceof Error ? err.message : "unknown error")
    }
  })

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
}
