/**
 * Backward-compatibility shim.
 * All new code should import from "@/lib/notifications/triggers" directly.
 */
export { notificationService } from "@/lib/notifications/service"
export type { NotificationPayload, BulkNotificationPayload } from "@/lib/notifications/service"
export {
  triggerLoyaltyEarned as notifyLoyaltyPoints,
  triggerLowStock as notifyLowStock,
  triggerOrderPlaced as notifyOrderPlaced,
} from "@/lib/notifications/triggers"

export async function notifyOrderStatusUpdate(
  userId: string, orderId: string, orderNumber: string, status: string
): Promise<void> {
  const { notificationService } = await import("@/lib/notifications/service")
  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: `Order ${status.charAt(0) + status.slice(1).toLowerCase()}`,
    body: `Order #${orderNumber} status updated.`,
    referenceType: "ORDER",
    referenceId: orderId,
  })
}
