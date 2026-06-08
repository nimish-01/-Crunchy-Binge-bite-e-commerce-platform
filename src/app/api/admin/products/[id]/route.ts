import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { productSchema } from "@/lib/validations/product"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { orderBy: { price: "asc" } },
        _count: { select: { reviews: true, orderItems: true } },
      },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { product } })
  } catch (error) {
    console.error("[GET /api/admin/products/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const body = await req.json()
    // Allow partial update — use productSchema with all fields optional
    const parsed = productSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { variants: submittedVariants, ...productData } = parsed.data

    // Check slug uniqueness if slug is being changed
    if (productData.slug && productData.slug !== existing.slug) {
      const slugConflict = await prisma.product.findUnique({ where: { slug: productData.slug } })
      if (slugConflict) {
        return NextResponse.json({ success: false, error: "A product with this slug already exists" }, { status: 409 })
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      // Update product fields
      await tx.product.update({ where: { id }, data: productData })

      if (submittedVariants && submittedVariants.length > 0) {
        const existingVariants = await tx.productVariant.findMany({ where: { productId: id } })
        const submittedSkus = new Set(submittedVariants.map((v) => v.sku).filter(Boolean))
        const existingSkus = new Set(existingVariants.map((v) => v.sku))

        // Upsert submitted variants
        for (const variant of submittedVariants) {
          if (!variant.sku) continue
          if (existingSkus.has(variant.sku)) {
            await tx.productVariant.update({ where: { sku: variant.sku }, data: variant })
          } else {
            await tx.productVariant.create({ data: { ...variant, productId: id } })
          }
        }

        // Handle removed variants (in DB but not in submission)
        for (const existingVariant of existingVariants) {
          if (!submittedSkus.has(existingVariant.sku)) {
            const hasOrders = await tx.orderItem.count({ where: { variantId: existingVariant.id } })
            if (hasOrders > 0) {
              // Soft-delete: mark inactive so orders remain intact
              await tx.productVariant.update({ where: { id: existingVariant.id }, data: { isActive: false } })
            } else {
              await tx.productVariant.delete({ where: { id: existingVariant.id } })
            }
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: { orderBy: { price: "asc" } },
        },
      })
    }, { timeout: 20000, maxWait: 5000 })

    return NextResponse.json({ success: true, data: { product }, message: "Product updated" })
  } catch (error) {
    console.error("[PATCH /api/admin/products/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    // Block delete if product has order items
    const orderItemCount = await prisma.orderItem.count({ where: { productId: id } })
    if (orderItemCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete product with existing orders. Archive it instead." },
        { status: 409 }
      )
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "Product deleted" })
  } catch (error) {
    console.error("[DELETE /api/admin/products/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
