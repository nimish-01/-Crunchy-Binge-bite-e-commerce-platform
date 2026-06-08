import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createRazorpayOrder } from "@/lib/razorpay"
import { validateCoupon } from "@/lib/coupon"

const schema = z.object({
  addressId: z.string().min(1, "Address is required"),
  couponCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { addressId, couponCode } = parsed.data

    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
      select: { pincode: true },
    })
    if (!address) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          select: {
            productId: true, variantId: true, quantity: true,
            variant: {
              select: { id: true, price: true, stock: true, isActive: true, product: { select: { name: true, status: true } } },
            },
          },
        },
      },
    })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: "Your cart is empty" }, { status: 400 })
    }

    let subtotal = 0
    for (const item of cart.items) {
      if (!item.variant.isActive || item.variant.product.status !== "ACTIVE") {
        return NextResponse.json({ success: false, error: `"${item.variant.product.name}" is no longer available` }, { status: 400 })
      }
      if (item.variant.stock < item.quantity) {
        return NextResponse.json({ success: false, error: `Insufficient stock for "${item.variant.product.name}"` }, { status: 400 })
      }
      subtotal += item.variant.price * item.quantity
    }

    // Validate coupon
    let couponResult: Awaited<ReturnType<typeof validateCoupon>> | null = null
    if (couponCode) {
      try {
        couponResult = await validateCoupon(couponCode, userId, subtotal)
      } catch (e) {
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Invalid coupon" }, { status: 400 })
      }
    }

    const discountAmount = couponResult?.discountAmount ?? 0
    const isFreeShipping = couponResult?.isFreeShipping ?? false

    const zone = await prisma.deliveryZone.findFirst({
      where: { pincodes: { has: address.pincode }, isActive: true },
      select: { deliveryCharge: true, freeDeliveryThreshold: true },
    })
    const deliveryCharge = (isFreeShipping || (zone && subtotal >= zone.freeDeliveryThreshold))
      ? 0
      : (zone?.deliveryCharge ?? 0)

    const total = Math.round((subtotal - discountAmount + deliveryCharge) * 100) / 100

    const expectedAmountPaise = Math.round(total * 100)
    const receipt = `bb_${Date.now()}`
    const rpOrder = await createRazorpayOrder(expectedAmountPaise, receipt)

    // Store expected amount + context for verify-time cross-check and webhook recovery
    await prisma.pendingPayment.upsert({
      where: { razorpayOrderId: rpOrder.id },
      create: {
        razorpayOrderId: rpOrder.id,
        userId,
        addressId,
        couponCode: couponCode ?? null,
        expectedAmountPaise,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      update: {},
    })

    return NextResponse.json({
      success: true,
      data: {
        razorpayOrderId: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        subtotal,
        discountAmount,
        deliveryCharge,
        total,
      },
    })
  } catch (error) {
    console.error("[POST /api/payment/create-order]", error)
    const message = error instanceof Error && error.message.includes("environment variables")
      ? "Payment gateway not configured. Please contact support."
      : "Failed to create payment order. Please try again."
    return NextResponse.json({ success: false, error: message }, { status: 503 })
  }
}
