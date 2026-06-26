import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns"

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const now   = new Date()
  const today = startOfDay(now)
  const week  = startOfWeek(now, { weekStartsOn: 1 })
  const month = startOfMonth(now)
  const year  = startOfYear(now)

  const deliveredStatuses = { status: { notIn: ["CANCELLED" as const, "REFUNDED" as const] } }

  const [
    revToday, revWeek, revMonth, revYear,
    ordToday, ordMonth, ordYear,
    newCust, totalCust,
    activePromos, lowStock, outOfStock,
    avgOrderMonth, returnCount, cancelCount,
    walletIssued, loyaltyIssued,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: today }, ...deliveredStatuses }, _sum: { subtotal: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: week },  ...deliveredStatuses }, _sum: { subtotal: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: month }, ...deliveredStatuses }, _sum: { subtotal: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: year },  ...deliveredStatuses }, _sum: { subtotal: true } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { createdAt: { gte: month } } }),
    prisma.order.count({ where: { createdAt: { gte: year },  ...deliveredStatuses } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: month } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.promotion.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { stock: { gt: 0, lte: 10 }, isActive: true } }),
    prisma.productVariant.count({ where: { stock: 0, isActive: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: month }, ...deliveredStatuses }, _avg: { subtotal: true } }),
    prisma.returnRequest.count({ where: { requestedAt: { gte: month } } }),
    prisma.order.count({ where: { createdAt: { gte: month }, status: "CANCELLED" } }),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.user.aggregate({ where: { role: "CUSTOMER" }, _sum: { loyaltyPoints: true } }),
  ])

  const aov = avgOrderMonth._avg.subtotal ?? 0
  const returnRate   = ordMonth > 0 ? Math.round((returnCount  / ordMonth) * 100 * 10) / 10 : 0
  const cancelRate   = ordMonth > 0 ? Math.round((cancelCount  / ordMonth) * 100 * 10) / 10 : 0

  return NextResponse.json({
    success: true,
    kpis: {
      revenue: {
        today:  revToday._sum.subtotal  ?? 0,
        week:   revWeek._sum.subtotal   ?? 0,
        month:  revMonth._sum.subtotal  ?? 0,
        year:   revYear._sum.subtotal   ?? 0,
      },
      orders: {
        today: ordToday,
        month: ordMonth,
        year:  ordYear,
        aov,
        returnRate,
        cancelRate,
      },
      customers: {
        total:     totalCust,
        new:       newCust,
        returning: totalCust - newCust,
      },
      inventory: {
        lowStock,
        outOfStock,
      },
      engagement: {
        activePromotions: activePromos,
        walletIssued:     walletIssued._sum.balance ?? 0,
        loyaltyPoints:    loyaltyIssued._sum.loyaltyPoints ?? 0,
      },
    },
  })
}
