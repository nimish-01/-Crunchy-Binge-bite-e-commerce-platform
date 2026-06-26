import { prisma } from "@/lib/prisma"

export async function getLoyaltySettings() {
  return prisma.loyaltySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  })
}

export async function earnLoyaltyPoints(
  userId: string,
  points: number,
  type: string,
  description: string,
  refType?: string,
  refId?: string,
) {
  if (points <= 0) return

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: { userId, type, points, description, refType, refId },
    }),
  ])
}

export async function redeemLoyaltyPoints(
  userId: string,
  points: number,
  description: string,
  refType?: string,
  refId?: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } })
  if (!user || user.loyaltyPoints < points) throw new Error("Insufficient loyalty points")

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { decrement: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: { userId, type: "REDEEM", points: -points, description, refType, refId },
    }),
  ])
}

export async function earnPurchasePoints(userId: string, orderTotal: number, orderId: string) {
  const settings = await getLoyaltySettings()
  const points = Math.floor(orderTotal * settings.pointsPerRupee)
  if (points <= 0) return
  await earnLoyaltyPoints(userId, points, "PURCHASE", `Earned ${points} points on order`, "order", orderId)
}

export function getMaxRedeemablePoints(
  orderTotal: number,
  userPoints: number,
  settings: { redemptionRate: number; maxRedemptionPercent: number },
): number {
  const maxFromOrder  = Math.floor((orderTotal * settings.maxRedemptionPercent) / 100 / settings.redemptionRate)
  return Math.min(userPoints, maxFromOrder)
}
