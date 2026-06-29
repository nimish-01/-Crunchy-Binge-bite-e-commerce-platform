import { prisma } from "@/lib/prisma"
import { createOrderFromCart } from "@/lib/services/checkout"

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
 * Called by both /api/payment/verify and /api/webhooks/razorpay.
 */
export async function createOrderFromCapturedPayment(
  params: CreateRazorpayOrderParams
): Promise<CreatedOrder> {
  const {
    userId,
    addressId,
    couponCode,
    razorpayOrderId,
    razorpayPaymentId,
    paymentMethod = "RAZORPAY",
    expectedAmountPaise,
  } = params

  const order = await createOrderFromCart({
    userId,
    addressId,
    couponCode,
    razorpayOrderId,
    transactionId: razorpayPaymentId,
    paymentMethod,
    paymentStatus: "PAID",
    status: "CONFIRMED",
    expectedAmountPaise,
  })

  await prisma.pendingPayment.deleteMany({ where: { razorpayOrderId } }).catch(() => {})

  return { id: order.id, orderNumber: order.orderNumber, total: order.total }
}
