import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") ?? "30", 10)))
  const since = new Date(Date.now() - days * 86400000)

  const [shipments, returns, failedDeliveries, courierBreakdown] = await Promise.all([
    prisma.shipment.findMany({
      where: { createdAt: { gte: since } },
      select: {
        status: true,
        shippingCost: true,
        dispatchedAt: true,
        deliveredAt: true,
        courierId: true,
      },
    }),
    prisma.returnRequest.count({ where: { requestedAt: { gte: since } } }),
    prisma.order.count({ where: { status: "DELIVERY_FAILED", updatedAt: { gte: since } } }),
    prisma.shipment.groupBy({
      by: ["courierId"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _sum: { shippingCost: true },
    }),
  ])

  const delivered = shipments.filter((s) => s.status === "DELIVERED")
  const avgDeliveryMs = delivered.length > 0
    ? delivered
        .filter((s) => s.dispatchedAt && s.deliveredAt)
        .reduce((acc, s) => acc + (s.deliveredAt!.getTime() - s.dispatchedAt!.getTime()), 0) /
        Math.max(1, delivered.filter((s) => s.dispatchedAt && s.deliveredAt).length)
    : 0

  const totalShippingCost = shipments.reduce((a, s) => a + s.shippingCost, 0)

  const courierIds = courierBreakdown.map((c) => c.courierId).filter(Boolean) as string[]
  const couriers = courierIds.length
    ? await prisma.courier.findMany({ where: { id: { in: courierIds } }, select: { id: true, name: true } })
    : []
  const courierMap = Object.fromEntries(couriers.map((c) => [c.id, c.name]))

  return NextResponse.json({
    success: true,
    data: {
      period: days,
      totalShipments: shipments.length,
      delivered: delivered.length,
      inTransit: shipments.filter((s) => ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(s.status)).length,
      failed: shipments.filter((s) => s.status === "DELIVERY_FAILED").length,
      returns,
      failedDeliveries,
      avgDeliveryDays: Math.round((avgDeliveryMs / 86400000) * 10) / 10,
      totalShippingCost,
      returnRate: shipments.length > 0 ? Math.round((returns / shipments.length) * 1000) / 10 : 0,
      courierBreakdown: courierBreakdown.map((c) => ({
        courierId: c.courierId,
        name: c.courierId ? (courierMap[c.courierId] ?? "Unknown") : "Unassigned",
        shipments: c._count.id,
        revenue: c._sum.shippingCost ?? 0,
      })),
    },
  })
}
