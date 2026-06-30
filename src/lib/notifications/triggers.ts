/**
 * Named trigger functions for every notification event.
 * Call these from API routes. Each function handles all channels + recipients.
 * All functions are fire-and-forget safe (never throw to callers).
 */

import { notificationService } from "./service"
import {
  welcomeTemplate,
  orderPlacedTemplate,
  paymentSuccessTemplate,
  paymentFailedTemplate,
  orderShippedTemplate,
  orderDeliveredTemplate,
  returnApprovedTemplate,
  refundCompletedTemplate,
} from "./templates"

// ─── Customer Triggers ───────────────────────────────────────────────────────

export async function triggerWelcome(userId: string, name: string, email: string): Promise<void> {
  const tpl = welcomeTemplate(name)
  await notificationService.send({
    userId,
    type: "GENERAL",
    title: "Welcome to Crunchy Bingebite! 🌾",
    body: "Your account is ready. Start exploring our premium makhana flavors.",
    referenceType: "WELCOME",
    email: { to: email, subject: tpl.subject, html: tpl.html },
  })
}

export async function triggerOrderPlaced(
  userId: string,
  orderId: string,
  orderNumber: string,
  total: number,
  itemCount: number,
  paymentMethod: string,
  userEmail: string,
  userName: string,
): Promise<void> {
  const tpl = orderPlacedTemplate(userName, orderNumber, total, itemCount, paymentMethod)
  await notificationService.send({
    userId,
    type: "ORDER_PLACED",
    title: "Order Placed Successfully!",
    body: `Your order #${orderNumber} has been confirmed. We'll start preparing it right away.`,
    referenceType: "ORDER",
    referenceId: orderId,
    email: { to: userEmail, subject: tpl.subject, html: tpl.html },
  })

  const adminIds = await notificationService.getAdminIds()
  await notificationService.sendBulk({
    userIds: adminIds,
    type: "ORDER_PLACED",
    title: "New Order Received",
    body: `Order #${orderNumber} — ₹${total.toFixed(2)} from ${userName}`,
    referenceType: "ORDER",
    referenceId: orderId,
  })

  const inventoryIds = await notificationService.getInventoryIds()
  await notificationService.sendBulk({
    userIds: inventoryIds,
    type: "GENERAL",
    title: "New Order to Pack",
    body: `Order #${orderNumber} is ready for packing (${itemCount} item${itemCount !== 1 ? "s" : ""})`,
    referenceType: "ORDER",
    referenceId: orderId,
  })
}

export async function triggerPaymentSuccess(
  userId: string,
  orderId: string,
  orderNumber: string,
  total: number,
  userEmail: string,
  userName: string,
): Promise<void> {
  const tpl = paymentSuccessTemplate(userName, orderNumber, total)
  await notificationService.send({
    userId,
    type: "PAYMENT_SUCCESS",
    title: "Payment Confirmed ✅",
    body: `₹${total.toFixed(2)} paid for order #${orderNumber}.`,
    referenceType: "ORDER",
    referenceId: orderId,
    email: { to: userEmail, subject: tpl.subject, html: tpl.html },
  })
}

export async function triggerPaymentFailed(userId: string, userEmail: string, userName: string): Promise<void> {
  const tpl = paymentFailedTemplate(userName)
  await notificationService.send({
    userId,
    type: "PAYMENT_FAILED",
    title: "Payment Failed",
    body: "Your payment could not be processed. Please try again.",
    email: { to: userEmail, subject: tpl.subject, html: tpl.html },
  })

  const adminIds = await notificationService.getAdminIds()
  await notificationService.sendBulk({
    userIds: adminIds,
    type: "PAYMENT_FAILED",
    title: "Payment Failed",
    body: `Payment failed for user ${userName} (${userEmail})`,
  })
}

export async function triggerOrderShipped(
  userId: string,
  orderId: string,
  orderNumber: string,
  userEmail: string,
  userName: string,
  trackingNumber?: string | null,
): Promise<void> {
  const tpl = orderShippedTemplate(userName, orderNumber, trackingNumber)
  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: "Order Shipped! 🚚",
    body: trackingNumber
      ? `Order #${orderNumber} shipped. Tracking: ${trackingNumber}`
      : `Order #${orderNumber} has been shipped and is on its way.`,
    referenceType: "ORDER",
    referenceId: orderId,
    email: { to: userEmail, subject: tpl.subject, html: tpl.html },
  })
}

export async function triggerOrderDelivered(
  userId: string,
  orderId: string,
  orderNumber: string,
  userEmail: string,
  userName: string,
): Promise<void> {
  const tpl = orderDeliveredTemplate(userName, orderNumber)
  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: "Order Delivered! 🎉",
    body: `Your order #${orderNumber} has been delivered. Enjoy your snacks!`,
    referenceType: "ORDER",
    referenceId: orderId,
    email: { to: userEmail, subject: tpl.subject, html: tpl.html },
  })
}

export async function triggerReturnApproved(
  userId: string,
  orderId: string,
  orderNumber: string,
  userEmail: string,
  userName: string,
): Promise<void> {
  const tpl = returnApprovedTemplate(userName, orderNumber)
  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: "Return Approved",
    body: `Your return request for order #${orderNumber} has been approved.`,
    referenceType: "ORDER",
    referenceId: orderId,
    email: { to: userEmail, subject: tpl.subject, html: tpl.html },
  })
}

export async function triggerReturnRejected(
  userId: string,
  orderId: string,
  orderNumber: string,
  userEmail: string,
  userName: string,
): Promise<void> {
  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: "Return Request Update",
    body: `Your return request for order #${orderNumber} could not be approved. Please contact support.`,
    referenceType: "ORDER",
    referenceId: orderId,
  })
}

export async function triggerRefundCompleted(
  userId: string,
  orderId: string,
  orderNumber: string,
  amount: number,
  userEmail: string,
  userName: string,
): Promise<void> {
  const tpl = refundCompletedTemplate(userName, orderNumber, amount)
  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: "Refund Processed",
    body: `Refund of ₹${amount.toFixed(2)} for order #${orderNumber} has been initiated.`,
    referenceType: "ORDER",
    referenceId: orderId,
    email: { to: userEmail, subject: tpl.subject, html: tpl.html },
  })
}

export async function triggerLoyaltyEarned(userId: string, points: number, reason: string): Promise<void> {
  await notificationService.send({
    userId,
    type: "LOYALTY_POINTS",
    title: `+${points} Binge Points Earned!`,
    body: `You earned ${points} points for ${reason}.`,
    referenceType: "LOYALTY",
  })
}

export async function triggerReturnRequest(
  orderId: string,
  orderNumber: string,
  userId: string,
  userName: string,
): Promise<void> {
  const adminIds = await notificationService.getAdminIds()
  await notificationService.sendBulk({
    userIds: adminIds,
    type: "GENERAL",
    title: "Return Request Received",
    body: `Return request for order #${orderNumber} from ${userName}`,
    referenceType: "RETURN",
    referenceId: orderId,
  })
}

export async function triggerNewReview(productName: string, reviewId: string): Promise<void> {
  const adminIds = await notificationService.getAdminIds()
  await notificationService.sendBulk({
    userIds: adminIds,
    type: "GENERAL",
    title: "New Review Submitted",
    body: `A new review was submitted for ${productName}`,
    referenceType: "REVIEW",
    referenceId: reviewId,
  })
}

export async function triggerNewCustomer(
  name: string,
  email: string,
  userId: string,
): Promise<void> {
  const adminIds = await notificationService.getAdminIds()
  await notificationService.sendBulk({
    userIds: adminIds,
    type: "GENERAL",
    title: "New Customer Registered",
    body: `${name} (${email}) just created an account.`,
    referenceType: "USER",
    referenceId: userId,
  })
}

export async function triggerLowStock(
  productName: string,
  variantId: string,
  currentStock: number,
): Promise<void> {
  const managerIds = await notificationService.getInventoryIds()
  await notificationService.sendBulk({
    userIds: managerIds,
    type: "LOW_STOCK",
    title: "Low Stock Alert",
    body: `${productName} has only ${currentStock} units remaining.`,
    referenceType: "VARIANT",
    referenceId: variantId,
  })
}

export async function triggerOutOfStock(productName: string, variantId: string): Promise<void> {
  const managerIds = await notificationService.getInventoryIds()
  await notificationService.sendBulk({
    userIds: managerIds,
    type: "LOW_STOCK",
    title: "Out of Stock",
    body: `${productName} is now out of stock.`,
    referenceType: "VARIANT",
    referenceId: variantId,
  })
}
