import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { productVariantSchema } from "@/lib/validations/product"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = productVariantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Check SKU uniqueness
    const existing = await prisma.productVariant.findUnique({ where: { sku: parsed.data.sku } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A variant with this SKU already exists" }, { status: 409 })
    }

    const variant = await prisma.productVariant.create({
      data: { ...parsed.data, productId: id },
    })

    return NextResponse.json(
      { success: true, data: { variant }, message: "Variant added" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/admin/products/[id]/variants]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
