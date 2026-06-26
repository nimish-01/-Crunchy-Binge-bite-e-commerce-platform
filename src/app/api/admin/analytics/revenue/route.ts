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

  const truncFn = range.bucket === "hour"
    ? "hour"
    : range.bucket === "month"
    ? "month"
    : "day"

  const [trend, summary, byPayment, topDays] = await Promise.all([
    // Date-bucketed revenue trend
    prisma.$queryRaw<{ period: Date; revenue: number; orders: bigint; discounts: number }[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata') AS period,
          COALESCE(SUM("subtotal"), 0)::float AS revenue,
          COUNT(*) AS orders,
          COALESCE(SUM("discountAmount"), 0)::float AS discounts
        FROM "Order"
        WHERE "createdAt" >= ${range.start}
          AND "createdAt" <= ${range.end}
          AND "status" NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata')
        ORDER BY period ASC
      `
    ),
    // Summary aggregates
    prisma.order.aggregate({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _sum: { subtotal: true, discountAmount: true, deliveryCharge: true },
      _count: { id: true },
      _avg: { subtotal: true },
    }),
    // Revenue by payment method
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: {
        createdAt: { gte: range.start, lte: range.end },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _sum: { subtotal: true },
      _count: { id: true },
    }),
    // Refunds in period
    prisma.order.aggregate({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        status: "REFUNDED",
      },
      _sum: { subtotal: true },
      _count: { id: true },
    }),
  ])

  return NextResponse.json({
    success: true,
    range: { start: range.start, end: range.end, label: range.label, bucket: range.bucket },
    trend: trend.map((r) => ({
      period: r.period,
      revenue:   toNum(r.revenue),
      orders:    toNum(r.orders),
      discounts: toNum(r.discounts),
    })),
    summary: {
      grossRevenue:   summary._sum.subtotal       ?? 0,
      discounts:      summary._sum.discountAmount ?? 0,
      shipping:       summary._sum.deliveryCharge ?? 0,
      netRevenue:     (summary._sum.subtotal ?? 0) - (summary._sum.discountAmount ?? 0),
      aov:            summary._avg.subtotal        ?? 0,
      totalOrders:    summary._count.id,
      refunds:        topDays._sum.subtotal        ?? 0,
      refundCount:    topDays._count.id,
    },
    byPayment: byPayment.map((p) => ({
      method:  p.paymentMethod,
      revenue: p._sum.subtotal ?? 0,
      orders:  p._count.id,
    })),
  })
}
