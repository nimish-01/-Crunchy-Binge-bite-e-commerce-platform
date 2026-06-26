import { NextResponse } from "next/server"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 86400000)

  const [
    toPack,
    readyToShip,
    shippedToday,
    deliveredToday,
    deliveryFailed,
    pendingReturns,
    allDelivered,
    inTransit,
  ] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "PACKING", "PACKED"] } } }),
    prisma.order.count({ where: { status: "READY_TO_SHIP" } }),
    prisma.shipment.count({ where: { dispatchedAt: { gte: today } } }),
    prisma.order.count({ where: { status: "DELIVERED", deliveredAt: { gte: today } } }),
    prisma.order.count({ where: { status: "DELIVERY_FAILED" } }),
    prisma.returnRequest.count({ where: { status: "PENDING" } }),
    prisma.shipment.findMany({
      where: { status: "DELIVERED", deliveredAt: { gte: weekAgo } },
      select: { dispatchedAt: true, deliveredAt: true },
    }),
    prisma.order.count({ where: { status: { in: ["SHIPPED", "OUT_FOR_DELIVERY"] } } }),
  ])

  // Average delivery time (days)
  let avgDeliveryDays = 0
  const withTimes = allDelivered.filter((s) => s.dispatchedAt && s.deliveredAt)
  if (withTimes.length > 0) {
    const total = withTimes.reduce((acc, s) => {
      return acc + (s.deliveredAt!.getTime() - s.dispatchedAt!.getTime()) / 86400000
    }, 0)
    avgDeliveryDays = Math.round((total / withTimes.length) * 10) / 10
  }

  // Courier performance (last 30 days)
  const courierStats = await prisma.shipment.groupBy({
    by: ["courierId"],
    where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    _count: { id: true },
  })

  const courierIds = courierStats.map((c) => c.courierId).filter(Boolean) as string[]
  const couriers = courierIds.length
    ? await prisma.courier.findMany({
        where: { id: { in: courierIds } },
        select: { id: true, name: true },
      })
    : []
  const courierMap = Object.fromEntries(couriers.map((c) => [c.id, c.name]))

  const courierPerformance = courierStats.map((c) => ({
    courierId: c.courierId,
    courierName: c.courierId ? (courierMap[c.courierId] ?? "Unknown") : "Unassigned",
    shipments: c._count.id,
  }))

  return NextResponse.json({
    success: true,
    data: {
      toPack,
      readyToShip,
      shippedToday,
      deliveredToday,
      deliveryFailed,
      pendingReturns,
      inTransit,
      avgDeliveryDays,
      courierPerformance,
    },
  })
}
