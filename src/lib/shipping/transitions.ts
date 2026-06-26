import type { OrderStatus, ShipmentStatus } from "@prisma/client"

// Valid forward transitions for OrderStatus
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ["CONFIRMED", "CANCELLED"],
  CONFIRMED:        ["PACKING", "CANCELLED"],
  PACKING:          ["PACKED", "READY_TO_SHIP", "CANCELLED"],
  PACKED:           ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP:    ["SHIPPED", "DISPATCHED", "CANCELLED"],
  SHIPPED:          ["OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED"],
  DISPATCHED:       ["OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERED:        ["RETURN_REQUESTED"],
  DELIVERY_FAILED:  ["OUT_FOR_DELIVERY", "CANCELLED"],
  RETURN_REQUESTED: ["RETURN_APPROVED", "CANCELLED"],
  RETURN_APPROVED:  ["RETURN_PICKED"],
  RETURN_PICKED:    ["RETURN_RECEIVED"],
  RETURN_RECEIVED:  ["REFUND_COMPLETED"],
  REFUND_COMPLETED: [],
  CANCELLED:        [],
  REFUNDED:         [],
}

// Valid transitions for ShipmentStatus
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED:          ["PACKING", "CANCELLED"],
  PACKING:          ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP:    ["SHIPPED", "CANCELLED"],
  SHIPPED:          ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
  IN_TRANSIT:       ["OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERED:        ["RETURN_INITIATED"],
  DELIVERY_FAILED:  ["OUT_FOR_DELIVERY", "CANCELLED"],
  RETURN_INITIATED: ["RETURN_PICKED"],
  RETURN_PICKED:    ["RETURNED"],
  RETURNED:         [],
  CANCELLED:        [],
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return SHIPMENT_TRANSITIONS[from]?.includes(to) ?? false
}

// Map shipment status → order status
export const SHIPMENT_TO_ORDER_STATUS: Partial<Record<ShipmentStatus, OrderStatus>> = {
  PACKING:          "PACKING",
  READY_TO_SHIP:    "READY_TO_SHIP",
  SHIPPED:          "SHIPPED",
  IN_TRANSIT:       "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED:        "DELIVERED",
  DELIVERY_FAILED:  "DELIVERY_FAILED",
  CANCELLED:        "CANCELLED",
}
