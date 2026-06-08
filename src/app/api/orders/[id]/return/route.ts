import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  reason: z.string().min(10, "Please describe the reason (at least 10 characters)").max(500),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { id, userId: session.user.id },
      include: {
        items: {
          include: { product: { select: { returnWindowDays: true } } },
        },
        returnRequest: { select: { id: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }
    if (order.status !== "DELIVERED") {
      return NextResponse.json({ success: false, error: "Returns are only available for delivered orders" }, { status: 400 })
    }
    if (!order.deliveredAt) {
      return NextResponse.json({ success: false, error: "Delivery date not recorded — please contact support" }, { status: 400 })
    }
    if (order.returnRequest) {
      return NextResponse.json({ success: false, error: "A return request already exists for this order" }, { status: 409 })
    }

    // Use the longest return window across all items in the order
    const maxWindow = Math.max(...order.items.map((i) => i.product.returnWindowDays))
    if (maxWindow === 0) {
      return NextResponse.json({ success: false, error: "This order is not eligible for returns" }, { status: 400 })
    }

    const windowMs = maxWindow * 24 * 60 * 60 * 1000
    const deadline = new Date(order.deliveredAt.getTime() + windowMs)
    if (new Date() > deadline) {
      return NextResponse.json({ success: false, error: `Return window closed — returns must be requested within ${maxWindow} days of delivery` }, { status: 400 })
    }

    const returnRequest = await prisma.returnRequest.create({
      data: { orderId: id, userId: session.user.id, reason: parsed.data.reason },
    })

    return NextResponse.json({ success: true, data: { returnRequest } }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/orders/[id]/return]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
