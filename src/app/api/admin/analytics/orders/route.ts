import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { parsePeriod, toNum } from "@/lib/services/analytics"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const range = parsePeriod(searchParams)

  const truncFn = range.bucket === "month" ? "month" : "day"

  const [trend, byStatus, byPayment, totals] = await Promise.all([
    prisma.$queryRaw<{ period: Date; orders: bigint }[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata') AS period,
          COUNT(*) AS orders
        FROM "Order"
        WHERE "createdAt" >= ${range.start} AND "createdAt" <= ${range.end}
        GROUP BY DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata')
        ORDER BY period ASC
      `
    ),
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
      _sum: { subtotal: true },
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
      _avg: { subtotal: true },
    }),
  ])

  const total   = totals._count.id
  const delivered = byStatus.find((s) => s.status === "DELIVERED")?._count.id ?? 0
  const cancelled = byStatus.find((s) => s.status === "CANCELLED")?._count.id ?? 0
  const returned  = byStatus.find((s) => s.status === "REFUNDED")?._count.id ?? 0

  return NextResponse.json({
    success: true,
    range: { start: range.start, end: range.end, label: range.label },
    trend: trend.map((r) => ({ period: r.period, orders: toNum(r.orders) })),
    byStatus: byStatus.map((s) => ({
      status:  s.status,
      count:   s._count.id,
      revenue: s._sum.subtotal ?? 0,
    })),
    byPayment: byPayment.map((p) => ({ method: p.paymentMethod, count: p._count.id })),
    metrics: {
      total,
      delivered,
      cancelled,
      returned,
      aov:           totals._avg.subtotal ?? 0,
      successRate:   total > 0 ? Math.round((delivered / total) * 100 * 10) / 10 : 0,
      cancelRate:    total > 0 ? Math.round((cancelled / total) * 100 * 10) / 10 : 0,
      returnRate:    total > 0 ? Math.round((returned  / total) * 100 * 10) / 10 : 0,
    },
  })
}
