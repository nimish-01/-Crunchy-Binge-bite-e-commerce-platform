import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { verifyRazorpaySignature } from "@/lib/razorpay"
import { createOrderFromCapturedPayment } from "@/lib/payment-order"
import { getCheckoutErrorResponse } from "@/lib/services/checkout"
import { triggerPaymentSuccess } from "@/lib/notifications/triggers"

const schema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  addressId: z.string().min(1),
  paymentMethod: z.string().default("RAZORPAY"),
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, addressId, paymentMethod, couponCode } = parsed.data

    // ─── Signature verification ────────────────────────────────────────────────
    let signatureValid: boolean
    try {
      signatureValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
    } catch {
      return NextResponse.json({ success: false, error: "Payment gateway not configured" }, { status: 503 })
    }
    if (!signatureValid) {
      console.error(`[payment/verify] Invalid signature — userId=${userId} rpOrderId=${razorpayOrderId}`)
      return NextResponse.json({ success: false, error: "Payment verification failed. Please contact support." }, { status: 400 })
    }

    // ─── Idempotency ───────────────────────────────────────────────────────────
    const existing = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, orderNumber: true, total: true },
    })
    if (existing) {
      return NextResponse.json({
        success: true,
        data: { orderId: existing.id, orderNumber: existing.orderNumber, total: existing.total },
        message: "Payment already processed",
      })
    }

    // ─── Fetch stored expected amount for cross-check ──────────────────────────
    const pendingPayment = await prisma.pendingPayment.findUnique({
      where: { razorpayOrderId },
      select: { expectedAmountPaise: true },
    })
    if (!pendingPayment) {
      // PendingPayment missing is non-fatal — log and proceed without amount check
      console.warn(`[payment/verify] No PendingPayment found for ${razorpayOrderId} — skipping amount cross-check`)
    }

    // ─── Create order (shared logic with webhook handler) ─────────────────────
    const order = await createOrderFromCapturedPayment({
      userId,
      addressId,
      couponCode: couponCode ?? null,
      razorpayOrderId,
      razorpayPaymentId,
      paymentMethod,
      expectedAmountPaise: pendingPayment?.expectedAmountPaise ?? null,
    })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }).catch(() => null)
    triggerPaymentSuccess(userId, order.id, order.orderNumber, order.total, user?.email ?? "", user?.name ?? "Customer").catch(() => {})

    return NextResponse.json({
      success: true,
      data: { orderId: order.id, orderNumber: order.orderNumber, total: order.total },
      message: "Payment verified. Order confirmed.",
    })
  } catch (error) {
    const known = getCheckoutErrorResponse(error)
    if (known) {
      return NextResponse.json({ success: false, error: known.message }, { status: known.status })
    }
    console.error("[POST /api/payment/verify]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
