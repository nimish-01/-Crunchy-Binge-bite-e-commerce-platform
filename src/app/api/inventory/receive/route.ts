import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireInventoryAccess, isInventorySession } from "@/lib/api-auth"

const receiveSchema = z.object({
  variantId: z.string().min(1, "variantId is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const inv = await requireInventoryAccess()
    if (!isInventorySession(inv)) return inv

    const body = await req.json()
    const parsed = receiveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { variantId, quantity, notes } = parsed.data

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true, productId: true },
    })
    if (!variant) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: quantity } },
        select: { id: true, stock: true, sku: true, weight: true },
      })

      const log = await tx.inventoryLog.create({
        data: {
          productId: variant.productId,
          variantId,
          updatedBy: inv.userId,
          updateType: "ADD",
          reason: "STOCK_RECEIVED",
          quantityChange: quantity,
          previousQuantity: variant.stock,
          newQuantity: variant.stock + quantity,
          notes: notes ?? null,
        },
      })

      return { variant: updated, log }
    }, { timeout: 15000, maxWait: 5000 })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Received ${quantity} units. New stock: ${result.variant.stock}`,
    })
  } catch (error) {
    console.error("[POST /api/inventory/receive]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
