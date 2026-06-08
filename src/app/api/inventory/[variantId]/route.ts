import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireInventoryAccess, isInventorySession } from "@/lib/api-auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const inv = await requireInventoryAccess()
    if (!isInventorySession(inv)) return inv

    const { variantId } = await params

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            category: { select: { id: true, name: true } },
          },
        },
        inventoryLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            updatedByUser: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    })

    if (!variant) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        variant: {
          ...variant,
          isLowStock: variant.stock > 0 && variant.stock <= variant.lowStockThreshold,
          isOutOfStock: variant.stock === 0,
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/inventory/[variantId]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
