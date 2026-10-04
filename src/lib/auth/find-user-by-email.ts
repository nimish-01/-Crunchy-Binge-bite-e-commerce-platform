import { prisma } from "@/lib/prisma"

/**
 * Registration stores email as typed, so match case-insensitively but prefer
 * an exact match if multiple accounts differ only by case.
 */
export async function findUserByEmail(email: string) {
  const matches = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true, name: true, email: true, image: true,
      role: true, isActive: true, tokenVersion: true,
    },
    take: 2,
  })
  return matches.find((u) => u.email === email) ?? (matches.length === 1 ? matches[0] : null)
}
