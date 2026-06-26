import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { parsePeriod } from "@/lib/services/analytics"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const range = parsePeriod(searchParams)

  const [earned, redeemed, topLoyaltyUsers, walletStats, referralStats, tierDist] = await Promise.all([
    prisma.loyaltyTransaction.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end }, points: { gt: 0 } },
      _sum: { points: true },
      _count: { id: true },
    }),
    prisma.loyaltyTransaction.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end }, points: { lt: 0 } },
      _sum: { points: true },
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER", loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, loyaltyPoints: true, loyaltyTier: true },
    }),
    prisma.wallet.aggregate({
      _sum: { balance: true },
      _count: { id: true },
    }),
    prisma.referral.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.user.groupBy({
      by: ["loyaltyTier"],
      where: { role: "CUSTOMER" },
      _count: { id: true },
    }),
  ])

  const walletTransactionsTotal = await prisma.walletTransaction.aggregate({
    where: { createdAt: { gte: range.start, lte: range.end }, amount: { gt: 0 } },
    _sum: { amount: true },
    _count: { id: true },
  })

  return NextResponse.json({
    success: true,
    range: { start: range.start, end: range.end, label: range.label },
    loyalty: {
      pointsEarned:   earned._sum.points    ?? 0,
      earns:          earned._count.id,
      pointsRedeemed: Math.abs(redeemed._sum.points ?? 0),
      redeems:        redeemed._count.id,
    },
    wallet: {
      totalBalance:    walletStats._sum.balance  ?? 0,
      totalWallets:    walletStats._count.id,
      creditsInPeriod: walletTransactionsTotal._sum.amount ?? 0,
      txInPeriod:      walletTransactionsTotal._count.id,
    },
    referrals: {
      total:     referralStats.reduce((s, r) => s + r._count.id, 0),
      completed: referralStats.find((r) => r.status === "COMPLETED")?._count.id ?? 0,
      pending:   referralStats.find((r) => r.status === "PENDING")?._count.id   ?? 0,
    },
    topLoyaltyUsers,
    tierDistribution: tierDist.map((t) => ({ tier: t.loyaltyTier, count: t._count.id })),
  })
}
