import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "REFUNDED"]),
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

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } })
  if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
    select: { id: true, status: true, orderNumber: true, deliveredAt: true },
  })

  return NextResponse.json({ success: true, data: { order: updated } })
}
