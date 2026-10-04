import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { findUserByEmail } from "@/lib/auth/find-user-by-email"
import { sendEmail } from "@/lib/notifications/email"
import { loginOtpTemplate } from "@/lib/notifications/templates"

export const OTP_TTL_MINUTES = 5
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_SECONDS = 60

// Per-account cap on codes sent (DB-backed → holds across serverless instances)
const MAX_REQUESTS_PER_WINDOW = 3
const REQUEST_WINDOW_MS = 15 * 60 * 1000

// Passwordless login is for customers only. Staff accounts can never receive
// or redeem a code, so this flow cannot produce an ADMIN/INVENTORY session.
const OTP_ROLE = "CUSTOMER"

// Every failed verification takes at least this long, so response time does
// not reveal whether the email has an account or an active code (the real-
// account path does several more queries than the unknown-email path).
const MIN_FAILURE_MS = 600

export type OtpVerifyResult =
  | {
      ok: true
      user: {
        id: string; name: string | null; email: string | null; image: string | null
        role: "CUSTOMER"; isActive: boolean; tokenVersion: number
      }
    }
  // Deliberately reason-less: wrong code, expired, used, locked, unknown email
  // and staff account must all be indistinguishable to the caller.
  | { ok: false }

const FAIL = { ok: false } as const

/** Uniform CSPRNG integer in [0, 999999], zero-padded → always 6 digits. */
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")
}

function otpSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET/NEXTAUTH_SECRET is not configured")
  return secret
}

/**
 * Keyed HMAC, not a plain hash: a 6-digit code has only 10^6 values, so an
 * unkeyed hash would be reversible instantly from a DB leak. Binding to userId
 * means a hash is meaningless for any other account.
 */
export function hashOtp(userId: string, otp: string): string {
  return crypto.createHmac("sha256", otpSecret()).update(`${userId}:${otp}`).digest("hex")
}

function otpMatches(userId: string, otp: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(userId, otp), "hex")
  const b = Buffer.from(storedHash, "hex")
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Issues and emails a login code. Silently does nothing for unknown, inactive,
 * staff, cooling-down or rate-limited accounts — callers must always return
 * the same generic response.
 */
export async function requestLoginOtp(email: string): Promise<void> {
  const user = await findUserByEmail(email)
  if (!user?.email || !user.isActive || user.role !== OTP_ROLE) return

  const now = new Date()
  const recent = await prisma.emailLoginOtp.findMany({
    where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - REQUEST_WINDOW_MS) } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return
  if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) return

  const otp = generateOtp()

  await prisma.$transaction([
    // Only the newest code may work: revoke earlier unused ones (usedAt doubles as "revoked")
    prisma.emailLoginOtp.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    // Housekeeping: drop this user's long-dead codes
    prisma.emailLoginOtp.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.emailLoginOtp.create({
      data: {
        userId: user.id,
        otpHash: hashOtp(user.id, otp),
        expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
      },
    }),
  ])

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email-otp] RESEND_API_KEY is not configured — login code was NOT sent")
    } else {
      // Development only: surface the code so the flow can be tested locally
      console.info(`[email-otp] DEV ONLY — email not configured. Login code for ${user.email}: ${otp}`)
    }
    return
  }

  const { subject, html } = loginOtpTemplate(otp, OTP_TTL_MINUTES)
  await sendEmail({ to: user.email, subject, html }) // logs failures, never throws
}

/**
 * Verifies a code and consumes it. An attempt is reserved atomically BEFORE
 * comparing, so parallel guesses can never exceed OTP_MAX_ATTEMPTS; the final
 * claim is conditional on usedAt IS NULL, so a code can be redeemed only once.
 * All failures return the same result after at least MIN_FAILURE_MS.
 */
export async function verifyLoginOtp(email: string, otp: string): Promise<OtpVerifyResult> {
  const startedAt = Date.now()
  const result = await verifyLoginOtpUnpadded(email, otp)
  if (!result.ok) {
    const wait = MIN_FAILURE_MS - (Date.now() - startedAt)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  }
  return result
}

async function verifyLoginOtpUnpadded(email: string, otp: string): Promise<OtpVerifyResult> {
  const user = await findUserByEmail(email)
  if (!user || !user.isActive || user.role !== OTP_ROLE) return FAIL

  const record = await prisma.emailLoginOtp.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, otpHash: true, expiresAt: true, attemptCount: true },
  })
  const now = new Date()
  if (!record || record.expiresAt <= now) return FAIL
  if (record.attemptCount >= OTP_MAX_ATTEMPTS) return FAIL

  const reserved = await prisma.emailLoginOtp.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now }, attemptCount: { lt: OTP_MAX_ATTEMPTS } },
    data: { attemptCount: { increment: 1 } },
  })
  if (reserved.count !== 1) return FAIL

  if (!otpMatches(user.id, otp, record.otpHash)) return FAIL

  const claimed = await prisma.emailLoginOtp.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (claimed.count !== 1) return FAIL

  // Re-read account state after the claim so the session gets the current
  // role/tokenVersion (a concurrent deactivation or role change wins)
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, image: true, role: true, isActive: true, tokenVersion: true },
  })
  if (!fresh || !fresh.isActive || fresh.role !== OTP_ROLE) return FAIL

  return { ok: true, user: { ...fresh, role: OTP_ROLE } }
}
