/**
 * Centralized Notification Service
 * Single source of truth for all notification delivery.
 * Channels: in-app (DB) + email (Resend)
 * Extensible for: SMS (MSG91), WhatsApp (Interakt), Push (FCM)
 */

import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@prisma/client"
import { sendEmail, type EmailPayload } from "./email"

export interface InAppPayload {
  userId: string
  type: NotificationType
  title: string
  body: string
  referenceType?: string
  referenceId?: string
}

export interface NotificationPayload extends InAppPayload {
  email?: EmailPayload
}

export interface BulkNotificationPayload {
  userIds: string[]
  type: NotificationType
  title: string
  body: string
  referenceType?: string
  referenceId?: string
  email?: EmailPayload
}

class NotificationService {
  async send(payload: NotificationPayload): Promise<void> {
    if (payload.referenceId) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const existing = await prisma.notification.findFirst({
        where: {
          userId: payload.userId,
          type: payload.type,
          referenceId: payload.referenceId,
          createdAt: { gte: since },
        },
        select: { id: true },
      })
      if (existing) return
    }

    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
      },
    })
    if (payload.email) {
      sendEmail(payload.email).catch((err) =>
        console.error("[notifications] email failed:", err)
      )
    }
  }

  async sendBulk(payload: BulkNotificationPayload): Promise<void> {
    if (!payload.userIds.length) return
    await prisma.notification.createMany({
      data: payload.userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
      })),
    })
  }

  async getAdminIds(): Promise<string[]> {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    })
    return admins.map((a) => a.id)
  }

  async getInventoryIds(): Promise<string[]> {
    const managers = await prisma.user.findMany({
      where: { role: { in: ["INVENTORY_MANAGER", "ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    })
    return managers.map((m) => m.id)
  }
}

export const notificationService = new NotificationService()
