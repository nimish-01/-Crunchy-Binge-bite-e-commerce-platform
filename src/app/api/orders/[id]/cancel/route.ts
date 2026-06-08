import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"] as const

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
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
        items: {
          select: {
            productId: true,
            variantId: true,
            quantity: true,
            variant: { select: { stock: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    if (!CANCELLABLE_STATUSES.includes(order.status as (typeof CANCELLABLE_STATUSES)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel an order with status "${order.status}". Only PENDING or CONFIRMED orders can be cancelled.`,
        },
        { status: 422 }
      )
    }

    // Restore inventory and update order status in a transaction
    await prisma.$transaction(async (tx) => {
      // Restore stock for each item
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            updatedBy: userId,
            updateType: "ADD",
            reason: "ORDER_CANCELLED",
            quantityChange: item.quantity,
            previousQuantity: item.variant.stock,
            newQuantity: item.variant.stock + item.quantity,
            notes: `Order ${order.orderNumber} cancelled`,
          },
        })
      }

      // Update order status
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      })
    }, { timeout: 20000, maxWait: 10000 })

    return NextResponse.json({
      success: true,
      data: { orderId: id, orderNumber: order.orderNumber, status: "CANCELLED" },
      message: "Order cancelled successfully. Inventory has been restored.",
    })
  } catch (error) {
    console.error("[POST /api/orders/[id]/cancel]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
