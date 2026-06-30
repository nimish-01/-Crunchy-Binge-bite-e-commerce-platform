import { notificationService } from "@/lib/notifications/service"
import {
  triggerOrderShipped,
  triggerOrderDelivered,
} from "@/lib/notifications/triggers"
import type { ShipmentStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function sendShipmentNotification(
  userId: string,
  orderId: string,
  status: ShipmentStatus,
  trackingNumber?: string | null,
): Promise<void> {
  // For SHIPPED and DELIVERED, use trigger functions that also send email
  if (status === "SHIPPED" || status === "DELIVERED") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    const orderData = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    })
    const email = user?.email ?? ""
    const name = user?.name ?? "Customer"
    const orderNumber = orderData?.orderNumber ?? orderId

    if (status === "SHIPPED") {
      await triggerOrderShipped(userId, orderId, orderNumber, email, name, trackingNumber)
      return
    }
    if (status === "DELIVERED") {
      await triggerOrderDelivered(userId, orderId, orderNumber, email, name)
      return
    }
  }

  // All other statuses: in-app only
  const MESSAGES: Partial<Record<ShipmentStatus, { title: string; body: (t?: string | null) => string }>> = {
    PACKING:          { title: "Your order is being packed", body: () => "We're carefully packing your Crunchy Bingebite order." },
    READY_TO_SHIP:    { title: "Order ready to ship", body: () => "Your order is packed and ready for pickup by our courier." },
    OUT_FOR_DELIVERY: { title: "Out for delivery today! 📦", body: () => "Your order is out for delivery. Please keep your phone handy." },
    DELIVERY_FAILED:  { title: "Delivery attempt failed", body: () => "We couldn't deliver your order. We'll try again soon." },
    RETURN_INITIATED: { title: "Return initiated", body: () => "Your return request has been initiated. Our team will reach out shortly." },
    RETURN_PICKED:    { title: "Return picked up", body: () => "Your return has been picked up by our courier." },
  }

  const msg = MESSAGES[status]
  if (!msg) return

  await notificationService.send({
    userId,
    type: "ORDER_STATUS_UPDATE",
    title: msg.title,
    body: msg.body(trackingNumber),
    referenceType: "ORDER",
    referenceId: orderId,
  })
}
