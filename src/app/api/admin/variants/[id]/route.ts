import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { productVariantSchema } from "@/lib/validations/product"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const variant = await prisma.productVariant.findUnique({ where: { id } })
    if (!variant) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = productVariantSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    // If SKU is changing, check uniqueness
    if (parsed.data.sku && parsed.data.sku !== variant.sku) {
      const conflict = await prisma.productVariant.findUnique({ where: { sku: parsed.data.sku } })
      if (conflict) {
        return NextResponse.json({ success: false, error: "A variant with this SKU already exists" }, { status: 409 })
      }
    }

    const updated = await prisma.productVariant.update({ where: { id }, data: parsed.data })

    return NextResponse.json({ success: true, data: { variant: updated }, message: "Variant updated" })
  } catch (error) {
    console.error("[PATCH /api/admin/variants/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const variant = await prisma.productVariant.findUnique({ where: { id } })
    if (!variant) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 })
    }

    const orderCount = await prisma.orderItem.count({ where: { variantId: id } })
    if (orderCount > 0) {
      // Soft-delete to preserve order history
      await prisma.productVariant.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({
        success: true,
        message: "Variant deactivated (has order history; cannot be fully deleted)",
      })
    }

    await prisma.productVariant.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Variant deleted" })
  } catch (error) {
    console.error("[DELETE /api/admin/variants/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
