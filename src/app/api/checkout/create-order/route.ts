import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { createOrderFromCart, getCheckoutErrorResponse } from "@/lib/services/checkout"
import { prisma } from "@/lib/prisma"
import { triggerOrderPlaced } from "@/lib/notifications/triggers"

const createOrderSchema = z.object({
  addressId: z.string().min(1, "Address is required"),
  paymentMethod: z.literal("COD").default("COD"),
  couponCode: z.string().optional(),
  gstRequired: z.boolean().default(false),
  giftMessage: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { addressId, paymentMethod, couponCode, gstRequired, giftMessage, notes } = parsed.data

    const order = await createOrderFromCart({
      userId,
      addressId,
      paymentMethod,
      paymentStatus: "PENDING",
      status: "PENDING",
      couponCode,
      gstRequired,
      giftMessage: giftMessage ?? null,
      notes: notes ?? null,
    })

    const [user, itemCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      prisma.orderItem.count({ where: { orderId: order.id } }),
    ])
    triggerOrderPlaced(userId, order.id, order.orderNumber, order.total, itemCount || 1, order.paymentMethod ?? "COD", user?.email ?? "", user?.name ?? "Customer").catch(() => {})

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id, orderNumber: order.orderNumber, status: order.status,
          subtotal: order.subtotal, discountAmount: order.discountAmount,
          deliveryCharge: order.deliveryCharge, total: order.total,
          paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, createdAt: order.createdAt,
        },
      },
      message: "Order placed successfully",
    }, { status: 201 })
  } catch (error) {
    const known = getCheckoutErrorResponse(error)
    if (known) {
      return NextResponse.json({ success: false, error: known.message }, { status: known.status })
    }
    console.error("[POST /api/checkout/create-order]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
