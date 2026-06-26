import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"
import { getLoyaltySettings, getMaxRedeemablePoints } from "@/lib/services/loyalty"

export async function GET(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { searchParams } = new URL(req.url)
  const page  = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = 20

  const [user, settings, transactions, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { loyaltyPoints: true, loyaltyTier: true },
    }),
    getLoyaltySettings(),
    prisma.loyaltyTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.loyaltyTransaction.count({ where: { userId: session.user.id } }),
  ])

  const tierThresholds = { BRONZE: 0, SILVER: 1000, GOLD: 5000, PLATINUM: 20000 }
  const nextTier = Object.entries(tierThresholds).find(
    ([, threshold]) => (user?.loyaltyPoints ?? 0) < threshold,
  )

  return NextResponse.json({
    success: true,
    points:       user?.loyaltyPoints ?? 0,
    tier:         user?.loyaltyTier   ?? "BRONZE",
    nextTier:     nextTier?.[0] ?? null,
    nextTierAt:   nextTier?.[1] ?? null,
    settings: {
      pointsPerRupee:       settings.pointsPerRupee,
      redemptionRate:       settings.redemptionRate,
      maxRedemptionPercent: settings.maxRedemptionPercent,
    },
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
