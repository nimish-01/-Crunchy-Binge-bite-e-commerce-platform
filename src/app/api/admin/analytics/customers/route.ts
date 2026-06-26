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

  const [growth, totalCustomers, newInPeriod, topCustomers, repeatBuyers] = await Promise.all([
    prisma.$queryRaw<{ period: Date; new_customers: bigint }[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata') AS period,
          COUNT(*) AS new_customers
        FROM "User"
        WHERE "createdAt" >= ${range.start}
          AND "createdAt" <= ${range.end}
          AND "role" = 'CUSTOMER'
        GROUP BY DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata')
        ORDER BY period ASC
      `
    ),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: range.start, lte: range.end } } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: range.start, lte: range.end }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { subtotal: true },
      _count: { id: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
    // Customers with 2+ orders (repeat buyers)
    prisma.$queryRaw<{ repeat_buyers: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) AS repeat_buyers
        FROM (
          SELECT "userId"
          FROM "Order"
          WHERE "createdAt" >= ${range.start} AND "createdAt" <= ${range.end}
            AND "status" NOT IN ('CANCELLED', 'REFUNDED')
          GROUP BY "userId"
          HAVING COUNT(*) >= 2
        ) sub
      `
    ),
  ])

  // Enrich top customers with user info
  const userIds = topCustomers.map((t) => t.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  const repeatCount = toNum(repeatBuyers[0]?.repeat_buyers ?? 0)
  const clv = totalCustomers > 0
    ? (topCustomers.reduce((s, t) => s + (t._sum.subtotal ?? 0), 0) / (topCustomers.length || 1))
    : 0

  return NextResponse.json({
    success: true,
    range: { start: range.start, end: range.end, label: range.label },
    growth: growth.map((r) => ({ period: r.period, newCustomers: toNum(r.new_customers) })),
    metrics: {
      total:        totalCustomers,
      newInPeriod,
      returning:    totalCustomers - newInPeriod,
      repeatBuyers: repeatCount,
      repeatRate:   newInPeriod > 0 ? Math.round((repeatCount / newInPeriod) * 100 * 10) / 10 : 0,
      avgCLV:       Math.round(clv),
    },
    topCustomers: topCustomers.map((t) => ({
      userId:  t.userId,
      name:    userMap[t.userId]?.name  ?? "—",
      email:   userMap[t.userId]?.email ?? "—",
      revenue: t._sum.subtotal ?? 0,
      orders:  t._count.id,
    })),
  })
}
