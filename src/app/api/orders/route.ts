import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { OrderStatus } from "@prisma/client"

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "REFUNDED",
]

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  status: z.enum(["PENDING", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
})

export async function GET(req: NextRequest) {
  try {
    void ORDER_STATUSES
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters" },
        { status: 400 }
      )
    }
    const { page, limit, status } = parsed.data

    const where = {
      userId,
      ...(status ? { status } : {}),
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          deliveryCharge: true,
          discountAmount: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
          createdAt: true,
          address: {
            select: { name: true, city: true, state: true, pincode: true },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              product: { select: { name: true, slug: true, images: true } },
              variant: { select: { weight: true, sku: true } },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error("[GET /api/orders]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
