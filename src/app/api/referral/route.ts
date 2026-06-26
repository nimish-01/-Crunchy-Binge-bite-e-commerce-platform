import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"

export async function GET(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { searchParams } = new URL(req.url)
  const page  = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = 20

  const [user, referrals, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralCode: true, name: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: session.user.id },
      include: {
        referee: { select: { name: true, email: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.referral.count({ where: { referrerId: session.user.id } }),
  ])

  const completedReferrals = await prisma.referral.count({
    where: { referrerId: session.user.id, status: "COMPLETED" },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://bingebite.in"
  const referralLink = `${baseUrl}?ref=${user?.referralCode}`

  return NextResponse.json({
    success: true,
    referralCode: user?.referralCode,
    referralLink,
    totalReferrals:    total,
    completedReferrals,
    referrals,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
