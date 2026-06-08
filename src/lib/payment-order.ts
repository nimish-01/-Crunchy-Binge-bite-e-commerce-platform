import { prisma } from "@/lib/prisma"
import { validateCoupon } from "@/lib/coupon"
import { generateOrderNumber } from "@/lib/utils"

export interface CreateRazorpayOrderParams {
  userId: string
  addressId: string
  couponCode?: string | null
  razorpayOrderId: string
  razorpayPaymentId: string
  paymentMethod?: string
  expectedAmountPaise?: number | null
}

export interface CreatedOrder {
  id: string
  orderNumber: string
  total: number
}

/**
 * Creates an Order atomically from a captured Razorpay payment.
 * Called by both /api/payment/verify (browser path) and /api/webhooks/razorpay (recovery path).
 *
 * Throws on:
 * - Cart empty / product unavailable
 * - Insufficient stock
 * - Amount mismatch (logs CRITICAL, does NOT throw — order is still created)
 */
export async function createOrderFromCapturedPayment(
  params: CreateRazorpayOrderParams
): Promise<CreatedOrder> {
  const { userId, addressId, couponCode, razorpayOrderId, razorpayPaymentId, paymentMethod = "RAZORPAY", expectedAmountPaise } = params

  // ─── Address ───────────────────────────────────────────────────────────────
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
    select: { id: true, pincode: true },
  })
  if (!address) throw new Error("Address not found")

  // ─── Cart ──────────────────────────────────────────────────────────────────
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true, items: { select: { productId: true, variantId: true, quantity: true } } },
  })
  if (!cart || cart.items.length === 0) throw new Error("Cart is empty")

  // Pre-compute subtotal for coupon validation (outside transaction)
  const variantPrices = await prisma.productVariant.findMany({
    where: { id: { in: cart.items.map((i) => i.variantId) } },
    select: { id: true, price: true },
  })
  const priceMap = Object.fromEntries(variantPrices.map((v) => [v.id, v.price]))
  const preSubtotal = cart.items.reduce((s, i) => s + (priceMap[i.variantId] ?? 0) * i.quantity, 0)

  // Coupon validation outside transaction
  let couponResult: Awaited<ReturnType<typeof validateCoupon>> | null = null
  if (couponCode) {
    try {
      couponResult = await validateCoupon(couponCode, userId, preSubtotal)
    } catch {
      console.warn(`[payment-order] Coupon "${couponCode}" invalid at order-create time — proceeding without discount`)
    }
  }

  // ─── Atomic order creation ─────────────────────────────────────────────────
  const order = await prisma.$transaction(async (tx) => {
    let subtotal = 0
    const orderItems: Array<{
      productId: string; variantId: string; quantity: number
      unitPrice: number; totalPrice: number; previousStock: number
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
        unitPrice: variant.price, totalPrice: lineTotal, previousStock: variant.stock,
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

    // Amount integrity check — log critical if mismatch, do not block the order
    if (expectedAmountPaise != null) {
      const computedPaise = Math.round(total * 100)
      if (Math.abs(computedPaise - expectedAmountPaise) > 1) {
        console.error(
          `[payment-order] CRITICAL AMOUNT MISMATCH — rpOrderId=${razorpayOrderId} ` +
          `expected=${expectedAmountPaise}p computed=${computedPaise}p diff=${computedPaise - expectedAmountPaise}p. ` +
          `Order will be created with computed total for inventory accuracy.`
        )
      }
    }

    const orderNumber = generateOrderNumber()
    const newOrder = await tx.order.create({
      data: {
        orderNumber, userId, addressId, status: "CONFIRMED",
        subtotal, discountAmount, deliveryCharge, total,
        paymentMethod, paymentStatus: "PAID",
        transactionId: razorpayPaymentId, razorpayOrderId,
        couponId: couponResult?.couponId ?? null,
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
          newQuantity: item.previousStock - item.quantity,
          notes: `Order ${orderNumber} · Razorpay ${razorpayPaymentId}`,
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

  // Clean up PendingPayment record (best-effort, failure is non-fatal)
  await prisma.pendingPayment.deleteMany({ where: { razorpayOrderId } }).catch(() => {})

  return { id: order.id, orderNumber: order.orderNumber, total: order.total }
}
