import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { createShipment } from "@/lib/shipping/service"

const createSchema = z.object({
  orderId:          z.string(),
  courierId:        z.string().optional(),
  trackingNumber:   z.string().optional(),
  trackingUrl:      z.string().url().optional().or(z.literal("")),
  weightGrams:      z.number().int().positive().optional(),
  lengthCm:         z.number().positive().optional(),
  widthCm:          z.number().positive().optional(),
  heightCm:         z.number().positive().optional(),
  packageType:      z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
  shippingCost:     z.number().min(0).optional(),
  codCharges:       z.number().min(0).optional(),
  insurance:        z.number().min(0).optional(),
  notes:            z.string().optional(),
})

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get("status") ?? undefined
  const courier  = searchParams.get("courier") ?? undefined
  const query    = searchParams.get("q") ?? undefined
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))

  const where: Record<string, unknown> = {}
  if (status)  where.status = status
  if (courier) where.courierId = courier
  if (query) {
    where.OR = [
      { shipmentNumber: { contains: query, mode: "insensitive" } },
      { trackingNumber: { contains: query, mode: "insensitive" } },
      { order: { orderNumber: { contains: query, mode: "insensitive" } } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        courier: { select: { id: true, name: true } },
        order: {
          select: {
            id: true, orderNumber: true, total: true, status: true,
            user: { select: { id: true, name: true, email: true } },
            address: { select: { city: true, state: true, pincode: true } },
          },
        },
      },
    }),
    prisma.shipment.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: { items, total, page, pages: Math.ceil(total / PAGE_SIZE) },
  })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const shipment = await createShipment({
      ...parsed.data,
      estimatedDelivery: parsed.data.estimatedDelivery ? new Date(parsed.data.estimatedDelivery) : undefined,
      createdBy: session.userId,
    })
    return NextResponse.json({ success: true, data: { shipment } }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create shipment"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
