import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/razorpay"
import { createOrderFromCapturedPayment } from "@/lib/payment-order"

// Razorpay sends webhooks as raw JSON. We must read text first for HMAC verification.
export async function POST(req: NextRequest) {
  // ─── Read raw body for signature check ────────────────────────────────────
  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 })
  }

  // ─── Verify webhook signature ─────────────────────────────────────────────
  let isValid: boolean
  try {
    isValid = verifyWebhookSignature(rawBody, signature)
  } catch (err) {
    // RAZORPAY_WEBHOOK_SECRET missing — instrumentation.ts prevents startup without it,
    // but if somehow reached, return 500 so Razorpay retries rather than accepting silently.
    console.error("[webhook/razorpay] Webhook secret not configured:", err)
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }
  if (!isValid) {
    console.error("[webhook/razorpay] Invalid signature — possible forged request")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // ─── Parse event ──────────────────────────────────────────────────────────
  let event: {
    event: string
    payload?: { payment?: { entity?: Record<string, unknown> } }
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const eventType = event.event
  const paymentEntity = event.payload?.payment?.entity

  if (!paymentEntity) {
    return NextResponse.json({ ok: true, message: "No payment entity in payload" })
  }

  const razorpayOrderId = paymentEntity["order_id"] as string | undefined
  const razorpayPaymentId = paymentEntity["id"] as string | undefined
  const amountPaise = paymentEntity["amount"] as number | undefined

  if (!razorpayOrderId || !razorpayPaymentId) {
    return NextResponse.json({ ok: true, message: "Missing order_id or payment id" })
  }

  // ─── payment.captured ─────────────────────────────────────────────────────
  if (eventType === "payment.captured") {
    // Idempotency: if order already exists (created by /verify), we're done
    const existing = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, orderNumber: true },
    })
    if (existing) {
      console.log(`[webhook/razorpay] payment.captured idempotent — order ${existing.orderNumber} already exists`)
      return NextResponse.json({ ok: true, message: "Already processed" })
    }

    // Look up PendingPayment for creation context
    const pending = await prisma.pendingPayment.findUnique({
      where: { razorpayOrderId },
    })
    if (!pending) {
      console.error(`[webhook/razorpay] payment.captured but no PendingPayment for ${razorpayOrderId} — cannot recover order`)
      return NextResponse.json({ ok: true, message: "No pending context found" })
    }

    // Amount sanity check before creating the order
    if (amountPaise != null && Math.abs(pending.expectedAmountPaise - amountPaise) > 1) {
      console.error(
        `[webhook/razorpay] CRITICAL AMOUNT MISMATCH — rpOrderId=${razorpayOrderId} ` +
        `expected=${pending.expectedAmountPaise}p captured=${amountPaise}p. Skipping order creation.`
      )
      return NextResponse.json({ ok: true, message: "Amount mismatch — flagged for manual review" })
    }

    try {
      const order = await createOrderFromCapturedPayment({
        userId: pending.userId,
        addressId: pending.addressId,
        couponCode: pending.couponCode,
        razorpayOrderId,
        razorpayPaymentId,
        paymentMethod: "RAZORPAY",
        expectedAmountPaise: pending.expectedAmountPaise,
      })
      console.log(`[webhook/razorpay] Order ${order.orderNumber} created via webhook recovery for ${razorpayOrderId}`)
      return NextResponse.json({ ok: true, message: "Order created", orderNumber: order.orderNumber })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      const isKnown = msg.includes("no longer available") || msg.includes("insufficient stock") || msg.includes("Cart is empty")
      console.error(`[webhook/razorpay] Order creation failed for ${razorpayOrderId}: ${msg}`)
      // Return 500 for transient errors (Razorpay will retry), 200 for permanent failures
      return NextResponse.json(
        { error: msg },
        { status: isKnown ? 200 : 500 }
      )
    }
  }

  // ─── payment.failed ───────────────────────────────────────────────────────
  if (eventType === "payment.failed") {
    const errorCode = paymentEntity["error_code"] as string | undefined
    const errorDesc = paymentEntity["error_description"] as string | undefined
    console.warn(
      `[webhook/razorpay] payment.failed — rpOrderId=${razorpayOrderId} ` +
      `paymentId=${razorpayPaymentId} error=${errorCode}: ${errorDesc}`
    )
    // Clean up PendingPayment since this payment attempt is terminal
    await prisma.pendingPayment.deleteMany({ where: { razorpayOrderId } }).catch(() => {})
    return NextResponse.json({ ok: true, message: "Acknowledged" })
  }

  // ─── Other events ─────────────────────────────────────────────────────────
  return NextResponse.json({ ok: true, message: `Event "${eventType}" not handled` })
}
