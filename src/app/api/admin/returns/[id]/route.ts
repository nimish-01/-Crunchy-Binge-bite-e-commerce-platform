import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { triggerReturnApproved, triggerRefundCompleted } from "@/lib/notifications/triggers"

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "COMPLETED"]),
  adminNotes: z.string().max(500).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin()
    if (!isAdminSession(session)) return session

    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const existing = await prisma.returnRequest.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Return request not found" }, { status: 404 })
    }
    if (existing.status === "COMPLETED") {
      return NextResponse.json({ success: false, error: "Cannot modify a completed return request" }, { status: 400 })
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes,
        resolvedAt: new Date(),
      },
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
      },
    })

    if (parsed.data.status === "APPROVED") {
      triggerReturnApproved(updated.userId, updated.orderId, updated.order.orderNumber, updated.user.email ?? "", updated.user.name ?? "Customer").catch(() => {})
    }
    if (parsed.data.status === "COMPLETED") {
      triggerRefundCompleted(updated.userId, updated.orderId, updated.order.orderNumber, updated.refundAmount ?? 0, updated.user.email ?? "", updated.user.name ?? "Customer").catch(() => {})
    }

    return NextResponse.json({ success: true, data: { returnRequest: updated } })
  } catch (error) {
    console.error("[PATCH /api/admin/returns/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
