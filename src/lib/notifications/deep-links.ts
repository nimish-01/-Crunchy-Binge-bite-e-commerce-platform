import type { Notification } from "@prisma/client"

export type NotificationPortal = "customer" | "admin" | "inventory"

export function getNotificationLink(n: Notification, portal: NotificationPortal): string {
  const { type, referenceType, referenceId } = n

  switch (portal) {
    case "customer":
      if (type === "ORDER_PLACED" || type === "ORDER_STATUS_UPDATE" || type === "PAYMENT_SUCCESS") {
        return referenceId ? `/orders/${referenceId}` : "/orders"
      }
      if (type === "PAYMENT_FAILED") return "/checkout"
      if (type === "LOYALTY_POINTS") return "/profile/loyalty"
      if (type === "COUPON_AVAILABLE" || type === "BACK_IN_STOCK") return "/products"
      if (referenceType === "ORDER" && referenceId) return `/orders/${referenceId}`
      if (referenceType === "WELCOME") return "/products"
      return "/notifications"

    case "admin":
      if ((type === "ORDER_PLACED" || type === "PAYMENT_SUCCESS" || type === "PAYMENT_FAILED") && referenceId) {
        return `/admin/orders/${referenceId}`
      }
      if (type === "ORDER_STATUS_UPDATE" && referenceType === "ORDER" && referenceId) {
        return `/admin/orders/${referenceId}`
      }
      if (type === "LOW_STOCK") return "/admin/inventory"
      if (referenceType === "USER" && referenceId) return `/admin/customers/${referenceId}`
      if (referenceType === "REVIEW") return "/admin/reviews"
      if (referenceType === "RETURN") return "/admin/returns"
      if (referenceType === "ORDER" && referenceId) return `/admin/orders/${referenceId}`
      return "/admin/notifications/inbox"

    case "inventory":
      if (type === "LOW_STOCK") return "/inventory/alerts"
      if (referenceType === "ORDER") return "/inventory/stock"
      if (referenceType === "VARIANT") return "/inventory/alerts"
      return "/inventory"

    default:
      return "/notifications"
  }
}
