import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id
    const { id } = await params

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        address: true,
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, images: true, dietaryTags: true } },
            variant: { select: { id: true, weight: true, price: true, mrp: true, sku: true } },
          },
        },
        coupon: { select: { code: true, type: true, value: true, description: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { order } })
  } catch (error) {
    console.error("[GET /api/orders/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
