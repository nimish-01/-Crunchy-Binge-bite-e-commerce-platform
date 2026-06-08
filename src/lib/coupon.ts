import { prisma } from "@/lib/prisma"

export interface CouponResult {
  couponId: string
  discountAmount: number
  isFreeShipping: boolean
}

/**
 * Validates a coupon code against the current user + subtotal.
 * Throws with a user-facing message on any failure.
 * Safe to call outside a transaction — run before entering $transaction.
 */
export async function validateCoupon(
  code: string,
  userId: string,
  subtotal: number
): Promise<CouponResult> {
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
    discountAmount = coupon.maxDiscount
      ? Math.min(coupon.value, coupon.maxDiscount)
      : coupon.value
  } else if (coupon.type === "PERCENTAGE") {
    discountAmount = (subtotal * coupon.value) / 100
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount)
  }
  discountAmount = Math.round(discountAmount * 100) / 100

  return { couponId: coupon.id, discountAmount, isFreeShipping: coupon.type === "FREE_SHIPPING" }
}

export function computeDiscount(
  type: string,
  value: number,
  maxDiscount: number | null,
  subtotal: number
): number {
  let d = 0
  if (type === "FLAT") d = maxDiscount ? Math.min(value, maxDiscount) : value
  else if (type === "PERCENTAGE") {
    d = (subtotal * value) / 100
    if (maxDiscount) d = Math.min(d, maxDiscount)
  }
  return Math.round(d * 100) / 100
}
