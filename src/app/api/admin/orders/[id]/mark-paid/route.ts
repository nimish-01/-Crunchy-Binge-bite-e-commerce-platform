import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const adminSession = await requireAdmin()
  if (!isAdminSession(adminSession)) return adminSession

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, orderNumber: true, paymentMethod: true, paymentStatus: true, status: true },
  })
  if (!order) {
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
  }
  if (order.paymentMethod !== "COD") {
    return NextResponse.json({ success: false, error: "Only COD orders can be marked as paid here." }, { status: 400 })
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ success: false, error: "Order is already marked as paid." }, { status: 400 })
  }
  if (order.paymentStatus === "REFUNDED") {
    return NextResponse.json({ success: false, error: "Cannot mark a refunded order as paid." }, { status: 400 })
  }

  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: { paymentStatus: "PAID" },
      select: { id: true, orderNumber: true, paymentStatus: true },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        role: adminSession.role,
        action: "MARK_PAID",
        module: "ORDER",
        entityType: "Order",
        entityId: id,
        oldValue: { paymentStatus: order.paymentStatus },
        newValue: { paymentStatus: "PAID" },
      },
    }),
  ])

  return NextResponse.json({ success: true, data: { order: updated } })
}
