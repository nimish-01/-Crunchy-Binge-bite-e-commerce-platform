import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { UserRole } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            role: true,
            isActive: true,
            tokenVersion: true,
          },
        })

        if (!user || !user.passwordHash || !user.isActive) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          isActive: user.isActive,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: UserRole }).role
        token.isActive = (user as { isActive?: boolean }).isActive ?? true
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as UserRole
      session.user.isActive = token.isActive as boolean

      // Node.js runtime only: real-time check against DB.
      // Invalidates stale tokens after deactivation or role change.
      // Skipped in Edge middleware (no Prisma in Edge) — middleware relies on JWT values.
      if (process.env.NEXT_RUNTIME === "nodejs" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isActive: true, role: true, tokenVersion: true },
          })
          const jwtTokenVersion = (token.tokenVersion as number) ?? 0
          if (!dbUser || !dbUser.isActive || dbUser.tokenVersion !== jwtTokenVersion) {
            // Stale token — clear user to force re-login on next protected-route render
            session.user.id = ""
            session.user.isActive = false
            return session
          }
          // Refresh with live DB values so role/isActive always reflects reality
          session.user.isActive = dbUser.isActive
          session.user.role = dbUser.role as UserRole
        } catch {
          // DB unavailable or Edge runtime: keep JWT values as fallback
        }
      }

      return session
    },
  },
})
