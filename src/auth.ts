import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { UserRole } from "@prisma/client"
import { authConfig } from "./auth.config"
import { otpRequestSchema, otpCodeSchema } from "@/lib/validations/auth"
import { verifyLoginOtp } from "@/lib/services/email-otp"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

// Surfaces a non-sensitive reason to the client as `result.code`. Every OTP
// failure is reported as "invalid" so the response can't reveal whether an
// account or active code exists; "rate_limited" is per-IP and account-agnostic.
class OtpSignInError extends CredentialsSignin {
  constructor(code: "invalid" | "rate_limited") {
    super()
    this.code = code
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true, name: true, email: true, image: true,
            passwordHash: true, role: true, isActive: true, tokenVersion: true,
          },
        })

        if (!user || !user.passwordHash || !user.isActive) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id:           user.id,
          name:         user.name,
          email:        user.email,
          image:        user.image,
          role:         user.role,
          isActive:     user.isActive,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
    // Passwordless email OTP — CUSTOMER accounts only (enforced in verifyLoginOtp).
    // Returns the same user shape as the password provider, so the JWT/session
    // callbacks and tokenVersion invalidation behave identically.
    Credentials({
      id: "email-otp",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code:  { label: "Code",  type: "text"  },
      },
      async authorize(credentials, request) {
        const email = otpRequestSchema.safeParse({ email: credentials?.email })
        const code  = otpCodeSchema.safeParse(credentials?.code)
        if (!email.success || !code.success) throw new OtpSignInError("invalid")

        if (!rateLimit(`otp-verify:${getClientIp(request)}`, 20, 15 * 60 * 1000)) {
          throw new OtpSignInError("rate_limited")
        }

        const result = await verifyLoginOtp(email.data.email, code.data)
        if (!result.ok) throw new OtpSignInError("invalid")
        return result.user
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      session.user.id       = token.id       as string
      session.user.role     = token.role     as UserRole
      session.user.isActive = token.isActive as boolean

      // Node.js runtime only: real-time check against DB.
      // Invalidates stale tokens after deactivation or role change.
      if (process.env.NEXT_RUNTIME === "nodejs" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where:  { id: token.id as string },
            select: { isActive: true, role: true, tokenVersion: true },
          })
          const jwtTokenVersion = (token.tokenVersion as number) ?? 0
          if (!dbUser || !dbUser.isActive || dbUser.tokenVersion !== jwtTokenVersion) {
            session.user.id       = ""
            session.user.isActive = false
            return session
          }
          session.user.isActive = dbUser.isActive
          session.user.role     = dbUser.role as UserRole
        } catch {
          // DB unavailable: keep JWT values as fallback
        }
      }

      return session
    },
  },
})
