import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const PAGE_SIZE = 25

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "PACKING", "PACKED"] },
        paymentStatus: "PAID",
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { createdAt: "asc" }, // oldest first — FIFO
      include: {
        user: { select: { id: true, name: true, email: true } },
        address: { select: { city: true, state: true, pincode: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
            variant: { select: { weight: true, sku: true } },
          },
        },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: ["CONFIRMED", "PACKING", "PACKED"] },
        paymentStatus: "PAID",
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: { orders, total, page, pages: Math.ceil(total / PAGE_SIZE) },
  })
}
