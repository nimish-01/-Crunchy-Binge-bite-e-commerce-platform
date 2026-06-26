import { prisma } from "@/lib/prisma"
import type { ShipmentStatus } from "@prisma/client"

const SHIPPING_NOTIFICATIONS: Partial<Record<ShipmentStatus, { title: string; body: (trackingNo?: string | null) => string }>> = {
  PACKING:          { title: "Your order is being packed", body: () => "We're carefully packing your Binge Bite order. It'll be on its way soon!" },
  READY_TO_SHIP:    { title: "Order ready to ship", body: () => "Your order is packed and ready for pickup by our courier partner." },
  SHIPPED:          { title: "Your order has been shipped! 🚚", body: (t) => t ? `Your order is on its way! Track with ${t}.` : "Your order has been dispatched and is on its way to you." },
  OUT_FOR_DELIVERY: { title: "Out for delivery today! 📦", body: () => "Your order is out for delivery. Please keep your phone handy." },
  DELIVERED:        { title: "Order delivered! 🎉", body: () => "Your Binge Bite order has been delivered. Enjoy your snacks!" },
  DELIVERY_FAILED:  { title: "Delivery attempt failed", body: () => "We couldn't deliver your order. We'll try again soon." },
  RETURN_INITIATED: { title: "Return initiated", body: () => "Your return request has been initiated. Our team will reach out shortly." },
  RETURN_PICKED:    { title: "Return picked up", body: () => "Your return has been picked up by our courier." },
}

export async function sendShipmentNotification(
  userId: string,
  orderId: string,
  status: ShipmentStatus,
  trackingNumber?: string | null
) {
  const notif = SHIPPING_NOTIFICATIONS[status]
  if (!notif) return

  await prisma.notification.create({
    data: {
      userId,
      type: "ORDER_STATUS_UPDATE",
      title: notif.title,
      body: notif.body(trackingNumber),
      referenceType: "order",
      referenceId: orderId,
    },
  })
}
