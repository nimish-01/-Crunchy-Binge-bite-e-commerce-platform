import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { parsePeriod } from "@/lib/services/analytics"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const range = parsePeriod(searchParams)

  const [usageByCode, summary, topCoupons, activeCoupons, expiredCoupons] = await Promise.all([
    prisma.couponUsage.groupBy({
      by: ["couponId"],
      where: { usedAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        couponId: { not: null },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _sum: { discountAmount: true, subtotal: true },
      _count: { id: true },
    }),
    prisma.coupon.findMany({
      orderBy: { usageCount: "desc" },
      take: 10,
      select: {
        id: true, code: true, type: true, value: true,
        usageCount: true, totalUsageLimit: true, validUntil: true, isActive: true,
      },
    }),
    prisma.coupon.count({ where: { isActive: true } }),
    prisma.coupon.count({ where: { isActive: false } }),
  ])

  const couponIds = usageByCode.map((u) => u.couponId)
  const coupons   = await prisma.coupon.findMany({
    where: { id: { in: couponIds } },
    select: { id: true, code: true, type: true, value: true },
  })
  const couponMap = Object.fromEntries(coupons.map((c) => [c.id, c]))

  return NextResponse.json({
    success: true,
    range: { start: range.start, end: range.end, label: range.label },
    summary: {
      totalOrdersWithCoupons: summary._count.id,
      totalDiscount:          summary._sum.discountAmount ?? 0,
      revenueWithCoupons:     summary._sum.subtotal       ?? 0,
      activeCoupons,
      expiredCoupons,
    },
    topCoupons: usageByCode.map((u) => ({
      couponId: u.couponId,
      code:     couponMap[u.couponId]?.code  ?? "—",
      type:     couponMap[u.couponId]?.type  ?? "—",
      value:    couponMap[u.couponId]?.value ?? 0,
      usages:   u._count.id,
    })),
    allCoupons: topCoupons.map((c) => ({
      id: c.id, code: c.code, type: c.type, value: c.value,
      totalUses:  c.usageCount,
      usageLimit: c.totalUsageLimit,
      isActive:   c.isActive,
      expiresAt:  c.validUntil,
    })),
  })
}
