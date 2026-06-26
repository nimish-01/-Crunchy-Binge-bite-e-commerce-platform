import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  status:         z.enum(["PENDING", "APPROVED", "REJECTED", "PICKED", "RECEIVED", "COMPLETED", "REFUNDED"]),
  adminNotes:     z.string().optional(),
  refundAmount:   z.number().min(0).optional(),
  refundMethod:   z.string().optional(),
  trackingNumber: z.string().optional(),
  courierName:    z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const returnReq = await prisma.returnRequest.findUnique({
    where: { id },
    select: { id: true, orderId: true, userId: true, status: true },
  })
  if (!returnReq) {
    return NextResponse.json({ success: false, error: "Return request not found" }, { status: 404 })
  }

  const isResolved = ["COMPLETED", "REFUNDED", "REJECTED"].includes(parsed.data.status)

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: {
      ...parsed.data,
      resolvedAt: isResolved ? new Date() : undefined,
    },
  })

  // Update order status to reflect return progress
  if (parsed.data.status === "APPROVED") {
    await prisma.order.update({ where: { id: returnReq.orderId }, data: { status: "RETURN_APPROVED" } })
  } else if (parsed.data.status === "PICKED") {
    await prisma.order.update({ where: { id: returnReq.orderId }, data: { status: "RETURN_PICKED" } })
  } else if (parsed.data.status === "RECEIVED") {
    await prisma.order.update({ where: { id: returnReq.orderId }, data: { status: "RETURN_RECEIVED" } })
  } else if (parsed.data.status === "REFUNDED") {
    await prisma.order.update({ where: { id: returnReq.orderId }, data: { status: "REFUND_COMPLETED" } })

    // Send notification
    await prisma.notification.create({
      data: {
        userId: returnReq.userId,
        type: "ORDER_STATUS_UPDATE",
        title: "Refund processed",
        body: "Your return has been received and a refund has been initiated. It will reflect within 5-7 business days.",
        referenceType: "order",
        referenceId: returnReq.orderId,
      },
    })
  }

  return NextResponse.json({ success: true, data: { returnRequest: updated } })
}
