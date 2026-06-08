/**
 * Notification Service — abstraction layer.
 * Current implementation: in-app DB notifications only.
 * To upgrade: add SMS (MSG91), WhatsApp (Interakt), Email (SendGrid) channels.
 */

import { prisma } from "@/lib/prisma"
import type { NotificationPayload } from "@/types"
import type { NotificationType } from "@prisma/client"

export interface INotificationService {
  send(payload: NotificationPayload): Promise<void>
  sendBulk(userIds: string[], payload: Omit<NotificationPayload, "userId">): Promise<void>
  markRead(notificationId: string): Promise<void>
  markAllRead(userId: string): Promise<void>
}

// ─── In-App Implementation ───────────────────────────────────────────────────

class InAppNotificationService implements INotificationService {
  async send(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as NotificationType,
        title: payload.title,
        body: payload.body,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
      },
    })
  }

  async sendBulk(userIds: string[], payload: Omit<NotificationPayload, "userId">): Promise<void> {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type as NotificationType,
        title: payload.title,
        body: payload.body,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
      })),
    })
  }

  async markRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }
}

// ─── Pre-built notification helpers ─────────────────────────────────────────

export async function notifyOrderPlaced(userId: string, orderId: string, orderNumber: string) {
  await notificationService.send({
    userId,
    type: "ORDER_PLACED",
    title: "Order Placed Successfully!",
    body: `Your order #${orderNumber} has been placed. We'll start preparing it right away.`,
    referenceType: "ORDER",
    referenceId: orderId,
  })
}

export async function notifyOrderStatusUpdate(userId: string, orderId: string, orderNumber: string, status: string) {
  const statusMessages: Record<string, string> = {
    CONFIRMED: "Your order is confirmed and being prepared.",
    PACKED: "Your order is packed and ready to ship.",
    DISPATCHED: "Your order is on its way!",
    DELIVERED: "Your order has been delivered. Enjoy your makhana!",
    CANCELLED: "Your order has been cancelled.",
  }
  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: `Order ${status.charAt(0) + status.slice(1).toLowerCase()}`,
    body: statusMessages[status] ?? `Order #${orderNumber} status updated to ${status}.`,
    referenceType: "ORDER",
    referenceId: orderId,
  })
}

export async function notifyLowStock(managerIds: string[], productName: string, variantId: string, currentStock: number) {
  await notificationService.sendBulk(managerIds, {
    type: "LOW_STOCK",
    title: "Low Stock Alert",
    body: `${productName} is running low (${currentStock} units left).`,
    referenceType: "VARIANT",
    referenceId: variantId,
  })
}

export async function notifyLoyaltyPoints(userId: string, points: number, reason: string) {
  await notificationService.send({
    userId,
    type: "LOYALTY_POINTS",
    title: "Points Earned!",
    body: `You earned ${points} Binge Points for ${reason}.`,
  })
}

// ─── Future channels ─────────────────────────────────────────────────────────
// class SmsNotificationDecorator wraps INotificationService and also sends SMS
// class WhatsAppNotificationDecorator wraps and also sends WhatsApp messages

export const notificationService: INotificationService = new InAppNotificationService()
