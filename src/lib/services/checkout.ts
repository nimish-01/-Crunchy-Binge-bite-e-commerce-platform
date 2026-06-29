import type { PaymentStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { generateOrderNumber } from "@/lib/utils"

interface CreateOrderFromCartParams {
  userId: string
  addressId: string
  paymentMethod: string
  paymentStatus?: PaymentStatus
  couponCode?: string | null
  transactionId?: string | null
  razorpayOrderId?: string | null
  expectedAmountPaise?: number | null
  status?: "PENDING" | "CONFIRMED"
  gstRequired?: boolean
  giftMessage?: string | null
  notes?: string | null
}

export interface CreatedCheckoutOrder {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  discountAmount: number
  deliveryCharge: number
  total: number
  paymentMethod: string | null
  paymentStatus: PaymentStatus
  createdAt: Date
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

function isKnownCheckoutError(error: Error) {
  return (
    error.message.includes("no longer available") ||
    error.message.includes("insufficient stock") ||
    error.message.includes("Cart is empty") ||
    error.message.includes("Address not found") ||
    error.message.includes("Coupon") ||
    error.message.includes("amount mismatch")
  )
}

export function getCheckoutErrorResponse(error: unknown) {
  if (error instanceof Error && isKnownCheckoutError(error)) {
    return { message: error.message, status: error.message.includes("amount mismatch") ? 409 : 422 }
  }
  return null
}

// ─── Pre-fetch coupon (reads only, outside transaction) ───────────────────────

interface CouponValidationResult {
  couponId: string
  discountAmount: number
  isFreeShipping: boolean
}

async function prefetchAndValidateCoupon(
  code: string,
  userId: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
    include: {
      _count: { select: { usages: true } },
      usages: { where: { userId }, select: { id: true } },
    },
  })

  if (!coupon || !coupon.isActive) throw new Error("Coupon is invalid or inactive")
  const now = new Date()
  if (now < coupon.validFrom) throw new Error("This coupon is not yet valid")
  if (now > coupon.validUntil) throw new Error("This coupon has expired")
  if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue)
    throw new Error(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`)
  if (coupon.totalUsageLimit !== null && coupon._count.usages >= coupon.totalUsageLimit)
    throw new Error("This coupon has reached its usage limit")
  if (coupon.usages.length >= coupon.perUserLimit)
    throw new Error("You have already used this coupon the maximum number of times")

  let discountAmount = 0
  if (coupon.type === "FLAT") {
    discountAmount = coupon.maxDiscount ? Math.min(coupon.value, coupon.maxDiscount) : coupon.value
  } else if (coupon.type === "PERCENTAGE") {
    discountAmount = (subtotal * coupon.value) / 100
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount)
  }

  return { couponId: coupon.id, discountAmount: roundMoney(discountAmount), isFreeShipping: coupon.type === "FREE_SHIPPING" }
}

// ─── Main service ─────────────────────────────────────────────────────────────

export async function createOrderFromCart(params: CreateOrderFromCartParams): Promise<CreatedCheckoutOrder> {
  const {
    userId,
    addressId,
    paymentMethod,
    paymentStatus = "PENDING",
    couponCode,
    transactionId = null,
    razorpayOrderId = null,
    expectedAmountPaise = null,
    status = paymentStatus === "PAID" ? "CONFIRMED" : "PENDING",
    gstRequired = false,
    giftMessage = null,
    notes = null,
  } = params

  // ── Fast idempotency check before doing any expensive work ────────────────
  if (razorpayOrderId) {
    const existing = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: {
        id: true, orderNumber: true, status: true, subtotal: true,
        discountAmount: true, deliveryCharge: true, total: true,
        paymentMethod: true, paymentStatus: true, createdAt: true,
      },
    })
    if (existing) return existing
  }

  // ── Pre-fetch ALL reads in parallel outside the transaction ───────────────
  // This eliminates N+1 sequential round-trips from inside the transaction.
  const [address, cart] = await Promise.all([
    prisma.address.findFirst({ where: { id: addressId, userId }, select: { id: true, pincode: true } }),
    prisma.cart.findUnique({
      where: { userId },
      select: { id: true, items: { select: { productId: true, variantId: true, quantity: true } } },
    }),
  ])
  if (!address) throw new Error("Address not found")
  if (!cart || cart.items.length === 0) throw new Error("Cart is empty")

  // Batch-fetch all variants in one query
  const variantIds = cart.items.map((i) => i.variantId)
  const [variantRows, zone] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true, price: true, stock: true, isActive: true,
        productId: true,
        product: { select: { name: true, status: true } },
      },
    }),
    prisma.deliveryZone.findFirst({
      where: { pincodes: { has: address.pincode }, isActive: true },
      select: { deliveryCharge: true, freeDeliveryThreshold: true },
    }),
  ])

  const variantMap = new Map(variantRows.map((v) => [v.id, v]))

  // Validate all items and compute subtotal without any DB queries
  let subtotal = 0
  const orderItems: Array<{
    productId: string; variantId: string; quantity: number
    unitPrice: number; totalPrice: number; previousStock: number; productName: string
  }> = []

  for (const cartItem of cart.items) {
    const variant = variantMap.get(cartItem.variantId)
    if (!variant || !variant.isActive || variant.product.status !== "ACTIVE")
      throw new Error("A product in your cart is no longer available")
    if (variant.stock < cartItem.quantity)
      throw new Error(`"${variant.product.name}" has insufficient stock (requested ${cartItem.quantity}, available ${variant.stock})`)

    const lineTotal = roundMoney(variant.price * cartItem.quantity)
    subtotal = roundMoney(subtotal + lineTotal)
    orderItems.push({
      productId: cartItem.productId,
      variantId: cartItem.variantId,
      quantity: cartItem.quantity,
      unitPrice: variant.price,
      totalPrice: lineTotal,
      previousStock: variant.stock,
      productName: variant.product.name,
    })
  }

  // Validate coupon (reads only — outside transaction)
  const couponResult = couponCode
    ? await prefetchAndValidateCoupon(couponCode, userId, subtotal)
    : null

  // Compute totals
  const discountAmount = couponResult?.discountAmount ?? 0
  const isFreeShipping = couponResult?.isFreeShipping ?? false
  const deliveryCharge =
    isFreeShipping || (zone && subtotal >= zone.freeDeliveryThreshold) ? 0 : (zone?.deliveryCharge ?? 0)
  const total = roundMoney(subtotal - discountAmount + deliveryCharge)

  if (expectedAmountPaise != null) {
    const computedPaise = Math.round(total * 100)
    if (Math.abs(computedPaise - expectedAmountPaise) > 1)
      throw new Error("Payment amount mismatch. Please retry checkout or contact support.")
  }

  // ── Transaction: writes only (fast) ──────────────────────────────────────
  // Queries inside: 1 idempotency + N stock decrements + 1 order + 1 orderItems + 1 couponUsage? + 1 couponUpdate? + 1 cartClear
  // = N + 4 to N + 6  (down from 4N + 7)
  const orderNumber = generateOrderNumber()

  const newOrder = await prisma.$transaction(async (tx) => {
    // Inner idempotency guard (racing webhooks / retries)
    if (razorpayOrderId) {
      const dup = await tx.order.findUnique({
        where: { razorpayOrderId },
        select: {
          id: true, orderNumber: true, status: true, subtotal: true,
          discountAmount: true, deliveryCharge: true, total: true,
          paymentMethod: true, paymentStatus: true, createdAt: true,
        },
      })
      if (dup) return dup
    }

    // Atomic stock decrements — one query per item (unavoidable for atomicity)
    for (const item of orderItems) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })
      if (updated.count === 0)
        throw new Error(`"${item.productName}" has insufficient stock (requested ${item.quantity}, available ${item.previousStock})`)
    }

    // Create order
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId, addressId, status, subtotal, discountAmount, deliveryCharge, total,
        paymentMethod, paymentStatus, transactionId, razorpayOrderId,
        couponId: couponResult?.couponId ?? null,
        gstRequired, giftMessage, notes,
      },
      select: {
        id: true, orderNumber: true, status: true, subtotal: true,
        discountAmount: true, deliveryCharge: true, total: true,
        paymentMethod: true, paymentStatus: true, createdAt: true,
      },
    })

    // Batch-create all order items in ONE query (was N separate creates)
    await tx.orderItem.createMany({
      data: orderItems.map((item) => ({
        orderId: created.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    })

    // Coupon usage (inside transaction so unique constraint guards concurrent use)
    if (couponResult) {
      await tx.couponUsage.create({
        data: {
          couponId: couponResult.couponId,
          userId,
          orderId: created.id,
          discountAmount: couponResult.discountAmount,
        },
      })
      await tx.coupon.update({
        where: { id: couponResult.couponId },
        data: { usageCount: { increment: 1 } },
      })
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

    return created
  }, { timeout: 15000, maxWait: 5000 })

  // ── Post-transaction: audit logs (non-critical, outside transaction) ──────
  // Fire-and-forget — a failure here does NOT roll back the order.
  prisma.inventoryLog.createMany({
    data: orderItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      updatedBy: userId,
      updateType: "REMOVE",
      reason: "ORDER_PLACED",
      quantityChange: -item.quantity,
      previousQuantity: item.previousStock,
      newQuantity: item.previousStock - item.quantity,
      notes: transactionId
        ? `Order ${orderNumber} · Razorpay ${transactionId}`
        : `Order ${orderNumber}`,
    })),
  }).catch((err) => console.error("[inventoryLog] non-fatal write failure:", err))

  return newOrder
}
