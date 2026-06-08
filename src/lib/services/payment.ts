/**
 * Payment Service — abstraction layer.
 * Current implementation: mock (always succeeds).
 * To upgrade: replace MockPaymentService with RazorpayPaymentService
 * and swap the export at the bottom.
 */

import type { PaymentIntent, PaymentResult } from "@/types"

export interface IPaymentService {
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, string>): Promise<PaymentIntent>
  verifyPayment(paymentId: string, orderId: string, signature?: string): Promise<PaymentResult>
  refund(transactionId: string, amount: number): Promise<{ success: boolean; refundId?: string }>
}

// ─── Mock Implementation ────────────────────────────────────────────────────

class MockPaymentService implements IPaymentService {
  async createPaymentIntent(
    amount: number,
    currency = "INR",
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    await new Promise((r) => setTimeout(r, 300)) // simulate latency
    return {
      id: `mock_pi_${Date.now()}`,
      amount,
      currency,
      status: "pending",
      metadata,
    }
  }

  async verifyPayment(paymentId: string, _orderId: string, _signature?: string): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 200))
    // Mock: always succeeds
    return {
      success: true,
      transactionId: paymentId,
    }
  }

  async refund(transactionId: string, amount: number): Promise<{ success: boolean; refundId?: string }> {
    await new Promise((r) => setTimeout(r, 200))
    return {
      success: true,
      refundId: `mock_ref_${transactionId}_${amount}`,
    }
  }
}

// ─── Future: Razorpay Implementation ────────────────────────────────────────
// class RazorpayPaymentService implements IPaymentService { ... }

// ─── Active Export ───────────────────────────────────────────────────────────
export const paymentService: IPaymentService = new MockPaymentService()
