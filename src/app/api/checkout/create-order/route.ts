import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { validateCoupon } from "@/lib/coupon"
import { generateOrderNumber } from "@/lib/utils"

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

    const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
    if (!address) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true, items: { select: { productId: true, variantId: true, quantity: true } } },
    })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: "Your cart is empty" }, { status: 400 })
    }

    // Pre-compute subtotal for coupon validation (before transaction)
    const variantPrices = await prisma.productVariant.findMany({
      where: { id: { in: cart.items.map((i) => i.variantId) } },
      select: { id: true, price: true },
    })
    const priceMap = Object.fromEntries(variantPrices.map((v) => [v.id, v.price]))
    const preSubtotal = cart.items.reduce((s, i) => s + (priceMap[i.variantId] ?? 0) * i.quantity, 0)

    // Validate coupon outside transaction
    let couponResult: Awaited<ReturnType<typeof validateCoupon>> | null = null
    if (couponCode) {
      try {
        couponResult = await validateCoupon(couponCode, userId, preSubtotal)
      } catch (e) {
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Invalid coupon" }, { status: 400 })
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0
      const orderItems: Array<{
        productId: string; variantId: string; quantity: number
        unitPrice: number; totalPrice: number; previousStock: number; productName: string
      }> = []

      for (const cartItem of cart.items) {
        const variant = await tx.productVariant.findFirst({
          where: { id: cartItem.variantId, isActive: true, product: { id: cartItem.productId, status: "ACTIVE" } },
          select: { id: true, price: true, stock: true, product: { select: { name: true } } },
        })
        if (!variant) throw new Error("A product in your cart is no longer available")

        const updated = await tx.productVariant.updateMany({
          where: { id: cartItem.variantId, stock: { gte: cartItem.quantity } },
          data: { stock: { decrement: cartItem.quantity } },
        })
        if (updated.count === 0) {
          throw new Error(`"${variant.product.name}" has insufficient stock (requested ${cartItem.quantity}, available ${variant.stock})`)
        }

        const lineTotal = variant.price * cartItem.quantity
        subtotal += lineTotal
        orderItems.push({
          productId: cartItem.productId, variantId: cartItem.variantId, quantity: cartItem.quantity,
          unitPrice: variant.price, totalPrice: lineTotal, previousStock: variant.stock, productName: variant.product.name,
        })
      }

      const zone = await tx.deliveryZone.findFirst({
        where: { pincodes: { has: address.pincode }, isActive: true },
        select: { deliveryCharge: true, freeDeliveryThreshold: true },
      })

      const discountAmount = couponResult?.discountAmount ?? 0
      const isFreeShipping = couponResult?.isFreeShipping ?? false
      const deliveryCharge = (isFreeShipping || (zone && subtotal >= zone.freeDeliveryThreshold))
        ? 0
        : (zone?.deliveryCharge ?? 0)
      const total = Math.round((subtotal - discountAmount + deliveryCharge) * 100) / 100
      const orderNumber = generateOrderNumber()

      const newOrder = await tx.order.create({
        data: {
          orderNumber, userId, addressId, status: "PENDING",
          subtotal, discountAmount, deliveryCharge, total,
          paymentMethod, paymentStatus: "PENDING",
          couponId: couponResult?.couponId ?? null,
          gstRequired, giftMessage: giftMessage ?? null, notes: notes ?? null,
        },
      })

      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id, productId: item.productId, variantId: item.variantId,
            quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice,
          },
        })
        await tx.inventoryLog.create({
          data: {
            productId: item.productId, variantId: item.variantId, updatedBy: userId,
            updateType: "REMOVE", reason: "ORDER_PLACED",
            quantityChange: -item.quantity, previousQuantity: item.previousStock,
            newQuantity: item.previousStock - item.quantity, notes: `Order ${orderNumber}`,
          },
        })
      }

      if (couponResult) {
        await tx.couponUsage.create({
          data: {
            couponId: couponResult.couponId, userId, orderId: newOrder.id,
            discountAmount: couponResult.discountAmount,
          },
        })
        await tx.coupon.update({
          where: { id: couponResult.couponId },
          data: { usageCount: { increment: 1 } },
        })
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      return newOrder
    }, { timeout: 20000, maxWait: 10000 })

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
    if (error instanceof Error) {
      const isKnown = error.message.includes("no longer available") || error.message.includes("insufficient stock")
      if (isKnown) return NextResponse.json({ success: false, error: error.message }, { status: 422 })
    }
    console.error("[POST /api/checkout/create-order]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
