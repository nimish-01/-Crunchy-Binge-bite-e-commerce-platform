import { prisma } from "@/lib/prisma"
import type { ShipmentStatus, OrderStatus } from "@prisma/client"
import { canTransitionShipment, SHIPMENT_TO_ORDER_STATUS } from "./transitions"

export interface CreateShipmentInput {
  orderId: string
  courierId?: string
  trackingNumber?: string
  trackingUrl?: string
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  packageType?: string
  estimatedDelivery?: Date
  shippingCost?: number
  codCharges?: number
  insurance?: number
  notes?: string
  createdBy: string
}

export interface UpdateShipmentStatusInput {
  shipmentId: string
  status: ShipmentStatus
  title: string
  description?: string
  location?: string
  createdBy?: string
}

function generateShipmentNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `SHP-${ts}-${rand}`
}

export async function createShipment(input: CreateShipmentInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, status: true, shipment: true },
  })
  if (!order) throw new Error("Order not found")
  if (order.shipment) throw new Error("Shipment already exists for this order")

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber: generateShipmentNumber(),
      orderId: input.orderId,
      courierId: input.courierId,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl,
      weightGrams: input.weightGrams,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      packageType: input.packageType ?? "STANDARD",
      estimatedDelivery: input.estimatedDelivery,
      shippingCost: input.shippingCost ?? 0,
      codCharges: input.codCharges ?? 0,
      insurance: input.insurance ?? 0,
      notes: input.notes,
      createdBy: input.createdBy,
      events: {
        create: {
          status: "CREATED",
          title: "Shipment Created",
          description: "Shipment has been created and is being prepared.",
          isManual: true,
          createdBy: input.createdBy,
        },
      },
    },
    include: { courier: true, events: true },
  })
  return shipment
}

export async function updateShipmentStatus(input: UpdateShipmentStatusInput) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: input.shipmentId },
    select: { id: true, status: true, orderId: true },
  })
  if (!shipment) throw new Error("Shipment not found")

  if (!canTransitionShipment(shipment.status, input.status)) {
    throw new Error(`Invalid transition: ${shipment.status} → ${input.status}`)
  }

  const now = new Date()
  const dateFields: Record<string, Date> = {}
  if (input.status === "SHIPPED") dateFields.dispatchedAt = now
  if (input.status === "DELIVERED") dateFields.deliveredAt = now

  const [updatedShipment] = await prisma.$transaction([
    prisma.shipment.update({
      where: { id: input.shipmentId },
      data: {
        status: input.status,
        ...dateFields,
        events: {
          create: {
            status: input.status,
            title: input.title,
            description: input.description,
            location: input.location,
            isManual: true,
            createdBy: input.createdBy,
          },
        },
      },
    }),
    // Sync order status if there's a mapped value
    ...(SHIPMENT_TO_ORDER_STATUS[input.status]
      ? [
          prisma.order.update({
            where: { id: shipment.orderId },
            data: {
              status: SHIPMENT_TO_ORDER_STATUS[input.status] as OrderStatus,
              ...(input.status === "DELIVERED" ? { deliveredAt: now } : {}),
            },
          }),
        ]
      : []),
  ])

  return updatedShipment
}

export async function getShipmentByOrder(orderId: string) {
  return prisma.shipment.findUnique({
    where: { orderId },
    include: {
      courier: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  })
}
