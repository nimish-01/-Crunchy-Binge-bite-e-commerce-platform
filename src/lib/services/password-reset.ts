import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/notifications/email"
import { passwordResetTemplate, passwordChangedTemplate } from "@/lib/notifications/templates"

export const RESET_TOKEN_TTL_MINUTES = 30

// Per-account cap on reset emails (DB-backed, so it holds across serverless instances)
const MAX_REQUESTS_PER_WINDOW = 3
const REQUEST_WINDOW_MS = 15 * 60 * 1000

// Same cost factor as registration / seed
const BCRYPT_ROUNDS = 12

// Only customers can reset via email. Staff accounts are excluded so this
// public flow can never be used to take over an ADMIN / INVENTORY_MANAGER login.
const RESETTABLE_ROLE = "CUSTOMER"

class InvalidResetTokenError extends Error {}

/** 32 bytes of CSPRNG output (256 bits), base64url → 43-char URL-safe token. */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url")
  return { token, tokenHash: hashResetToken(token) }
}

/**
 * SHA-256 is appropriate here (not bcrypt): the token is high-entropy random
 * data, so it can't be brute-forced, and a deterministic hash allows an indexed
 * lookup. Looking up by hash also means no secret-dependent string comparison.
 */
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

async function findUserByEmail(email: string) {
  // Registration stores email as typed, so match case-insensitively but
  // prefer an exact match if multiple accounts differ only by case.
  const matches = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true, email: true, role: true, isActive: true },
    take: 2,
  })
  return matches.find((u) => u.email === email) ?? (matches.length === 1 ? matches[0] : null)
}

/**
 * Issues a reset token and emails it. Silently does nothing for unknown,
 * inactive, staff or rate-limited accounts — callers must always show the
 * same generic response.
 */
export async function requestPasswordReset(email: string, origin: string): Promise<void> {
  const user = await findUserByEmail(email)
  if (!user?.email || !user.isActive || user.role !== RESETTABLE_ROLE) return

  const now = new Date()
  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - REQUEST_WINDOW_MS) } },
  })
  if (recent >= MAX_REQUESTS_PER_WINDOW) return

  const { token, tokenHash } = generateResetToken()

  await prisma.$transaction([
    // Invalidate any previous unused tokens (usedAt doubles as "revoked")
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    // Housekeeping: drop this user's long-dead tokens
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    }),
  ])

  const resetUrl = `${origin}/reset-password?token=${token}`

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error("[password-reset] RESEND_API_KEY is not configured — reset email was NOT sent")
    } else {
      // Development only: surface the link so the flow can be tested locally
      console.info(`[password-reset] DEV ONLY — email not configured. Reset link for ${user.email}:\n${resetUrl}`)
    }
    return
  }

  const { subject, html } = passwordResetTemplate(user.name, resetUrl, RESET_TOKEN_TTL_MINUTES)
  await sendEmail({ to: user.email, subject, html })
}

async function findValidToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: {
      id: true, userId: true, expiresAt: true, usedAt: true,
      user: { select: { name: true, email: true, role: true, isActive: true } },
    },
  })
  if (
    !record ||
    record.usedAt ||
    record.expiresAt <= new Date() ||
    !record.user.isActive ||
    record.user.role !== RESETTABLE_ROLE
  ) {
    return null
  }
  return record
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  return (await findValidToken(token)) !== null
}

/**
 * Consumes the token and sets the new password atomically. Bumping
 * tokenVersion invalidates every existing JWT session (checked in auth.ts).
 */
export async function resetPasswordWithToken(
  token: string, newPassword: string, origin: string
): Promise<"ok" | "invalid"> {
  const record = await findValidToken(token)
  if (!record) return "invalid"

  // Hash outside the transaction to keep it short
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date()

      // Conditional claim → only one concurrent request can consume the token
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      })
      if (claimed.count !== 1) throw new InvalidResetTokenError()

      // Re-check account state inside the transaction; role is never changed
      const updated = await tx.user.updateMany({
        where: { id: record.userId, isActive: true, role: RESETTABLE_ROLE },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      })
      if (updated.count !== 1) throw new InvalidResetTokenError()

      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      })
      await tx.session.deleteMany({ where: { userId: record.userId } })
    })
  } catch (err) {
    if (err instanceof InvalidResetTokenError) return "invalid"
    throw err
  }

  if (record.user.email && process.env.RESEND_API_KEY) {
    const { subject, html } = passwordChangedTemplate(record.user.name, `${origin}/login`)
    await sendEmail({ to: record.user.email, subject, html }) // never throws
  }

  return "ok"
}
