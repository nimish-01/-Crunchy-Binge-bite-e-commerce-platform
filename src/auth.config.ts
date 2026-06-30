import type { NextAuthConfig } from "next-auth"
import type { UserRole } from "@prisma/client"

/**
 * Edge-compatible auth config — NO Prisma, NO Node.js-only imports.
 * Used by middleware and as the base for the full auth.ts config.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id           = (user as { id?: string }).id ?? ""
        token.role         = (user as { role?: string }).role
        token.isActive     = (user as { isActive?: boolean }).isActive ?? true
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0
      }
      return token
    },
    session({ session, token }) {
      if (token.id)   session.user.id       = token.id       as string
      if (token.role) session.user.role     = token.role     as UserRole
                      session.user.isActive = (token.isActive as boolean) ?? true
      return session
    },
  },
} satisfies NextAuthConfig
