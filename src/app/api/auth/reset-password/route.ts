import { NextRequest, NextResponse } from "next/server"
import { resetPasswordSchema, resetTokenSchema } from "@/lib/validations/auth"
import { resetPasswordWithToken } from "@/lib/services/password-reset"
import { getAppOrigin } from "@/lib/app-url"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const INVALID_TOKEN = {
  success: false,
  code: "INVALID_TOKEN",
  error: "This reset link is invalid or has expired. Please request a new one.",
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`reset-password:${getClientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  let body: { token?: unknown; password?: unknown; confirmPassword?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const token = resetTokenSchema.safeParse(body.token)
  if (!token.success) return NextResponse.json(INVALID_TOKEN, { status: 400 })

  const parsed = resetPasswordSchema.safeParse({
    password: body.password,
    confirmPassword: body.confirmPassword,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  try {
    const result = await resetPasswordWithToken(
      token.data, parsed.data.password, getAppOrigin(req.nextUrl.origin)
    )
    if (result === "invalid") return NextResponse.json(INVALID_TOKEN, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err instanceof Error ? err.message : "unknown error")
    return NextResponse.json({ success: false, error: "Could not reset password" }, { status: 500 })
  }
}
