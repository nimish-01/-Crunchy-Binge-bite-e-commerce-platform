import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { updateShipmentStatus } from "@/lib/shipping/service"
import { sendShipmentNotification } from "@/lib/shipping/notifications"
import type { ShipmentStatus } from "@prisma/client"

const updateSchema = z.object({
  courierId:        z.string().optional().nullable(),
  trackingNumber:   z.string().optional().nullable(),
  trackingUrl:      z.string().optional().nullable(),
  weightGrams:      z.number().int().positive().optional().nullable(),
  lengthCm:         z.number().positive().optional().nullable(),
  widthCm:          z.number().positive().optional().nullable(),
  heightCm:         z.number().positive().optional().nullable(),
  packageType:      z.string().optional(),
  estimatedDelivery: z.string().datetime().optional().nullable(),
  shippingCost:     z.number().min(0).optional(),
  codCharges:       z.number().min(0).optional(),
  insurance:        z.number().min(0).optional(),
  notes:            z.string().optional().nullable(),
  status:           z.string().optional(),
  statusTitle:      z.string().optional(),
  statusDescription: z.string().optional(),
  statusLocation:   z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      courier: true,
      events: { orderBy: { createdAt: "asc" } },
      order: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          address: true,
          items: {
            include: {
              product: { select: { name: true, images: true, slug: true } },
              variant: { select: { weight: true, sku: true } },
            },
          },
        },
      },
    },
  })

  if (!shipment) {
    return NextResponse.json({ success: false, error: "Shipment not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: { shipment } })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { status, statusTitle, statusDescription, statusLocation, ...fields } = parsed.data

  try {
    let shipment
    if (status) {
      shipment = await updateShipmentStatus({
        shipmentId: id,
        status: status as ShipmentStatus,
        title: statusTitle ?? status,
        description: statusDescription,
        location: statusLocation,
        createdBy: session.userId,
      })

      // Notify customer
      const orderWithUser = await prisma.order.findUnique({
        where: { id: shipment.orderId },
        select: { userId: true, id: true, shipment: { select: { trackingNumber: true } } },
      })
      if (orderWithUser) {
        await sendShipmentNotification(
          orderWithUser.userId,
          orderWithUser.id,
          status as ShipmentStatus,
          orderWithUser.shipment?.trackingNumber
        )
      }
    } else {
      const updateData: Record<string, unknown> = {}
      if ("courierId"         in fields) updateData.courierId         = fields.courierId
      if ("trackingNumber"    in fields) updateData.trackingNumber    = fields.trackingNumber
      if ("trackingUrl"       in fields) updateData.trackingUrl       = fields.trackingUrl
      if ("weightGrams"       in fields) updateData.weightGrams       = fields.weightGrams
      if ("lengthCm"          in fields) updateData.lengthCm          = fields.lengthCm
      if ("widthCm"           in fields) updateData.widthCm           = fields.widthCm
      if ("heightCm"          in fields) updateData.heightCm          = fields.heightCm
      if ("packageType"       in fields) updateData.packageType       = fields.packageType
      if ("estimatedDelivery" in fields) updateData.estimatedDelivery = fields.estimatedDelivery ? new Date(fields.estimatedDelivery as string) : null
      if ("shippingCost"      in fields) updateData.shippingCost      = fields.shippingCost
      if ("codCharges"        in fields) updateData.codCharges        = fields.codCharges
      if ("insurance"         in fields) updateData.insurance         = fields.insurance
      if ("notes"             in fields) updateData.notes             = fields.notes

      shipment = await prisma.shipment.update({ where: { id }, data: updateData })
    }

    return NextResponse.json({ success: true, data: { shipment } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update shipment"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
