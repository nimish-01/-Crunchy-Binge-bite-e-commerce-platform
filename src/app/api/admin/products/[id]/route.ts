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

    if (submittedVariants && submittedVariants.length > 0) {
      // Reject duplicate SKUs within the submission itself — upserting two
      // variants with the same SKU by SKU-lookup used to crash the whole save.
      const skuCounts = new Map<string, number>()
      for (const v of submittedVariants) {
        if (!v.sku) continue
        skuCounts.set(v.sku, (skuCounts.get(v.sku) ?? 0) + 1)
      }
      const dupeSku = [...skuCounts.entries()].find(([, count]) => count > 1)?.[0]
      if (dupeSku) {
        return NextResponse.json({ success: false, error: `Duplicate SKU "${dupeSku}" — each variant needs a unique SKU.` }, { status: 400 })
      }

      // Reject SKUs already claimed by a different product (SKU is globally unique)
      const skusInUse = await prisma.productVariant.findMany({
        where: { sku: { in: submittedVariants.map((v) => v.sku).filter(Boolean) }, NOT: { productId: id } },
        select: { sku: true },
      })
      if (skusInUse.length > 0) {
        return NextResponse.json({ success: false, error: `SKU "${skusInUse[0].sku}" is already used by another product.` }, { status: 409 })
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      // Update product fields
      await tx.product.update({ where: { id }, data: productData })

      if (submittedVariants && submittedVariants.length > 0) {
        const existingVariants = await tx.productVariant.findMany({ where: { productId: id } })
        const submittedSkus = new Set(submittedVariants.map((v) => v.sku).filter(Boolean))
        const existingBySku = new Map(existingVariants.map((v) => [v.sku, v]))

        // Upsert submitted variants — matched by id (via the pre-fetched sku
        // map) so a mid-loop create can never collide with a later lookup.
        for (const variant of submittedVariants) {
          if (!variant.sku) continue
          const match = existingBySku.get(variant.sku)
          if (match) {
            await tx.productVariant.update({ where: { id: match.id }, data: variant })
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

        // Exactly one active variant must be the "default" shown on
        // listing/homepage/search cards — auto-correct to the cheapest
        // active variant if the submission left zero or more than one set.
        const activeVariants = await tx.productVariant.findMany({ where: { productId: id, isActive: true } })
        const defaultCount = activeVariants.filter((v) => v.isDefault).length
        if (activeVariants.length > 0 && defaultCount !== 1) {
          const cheapest = [...activeVariants].sort((a, b) => a.price - b.price)[0]
          await tx.productVariant.updateMany({ where: { productId: id, isActive: true }, data: { isDefault: false } })
          await tx.productVariant.update({ where: { id: cheapest.id }, data: { isDefault: true } })
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
    const code = (error as { code?: string } | null)?.code
    if (code === "P2002") {
      return NextResponse.json({ success: false, error: "A product or variant with this slug/SKU already exists." }, { status: 409 })
    }
    if (code === "P2003") {
      return NextResponse.json({ success: false, error: "Invalid category selected." }, { status: 400 })
    }
    if (code === "P2025") {
      return NextResponse.json({ success: false, error: "Product or variant no longer exists — refresh and try again." }, { status: 404 })
    }
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

    const [cartItemCount, wishlistCount, subscriptionCount] = await Promise.all([
      prisma.cartItem.count({ where: { productId: id } }),
      prisma.wishlist.count({ where: { productId: id } }),
      prisma.subscription.count({ where: { productId: id } }),
    ])
    if (cartItemCount > 0 || wishlistCount > 0 || subscriptionCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete product — it's in a customer's cart, wishlist, or an active subscription. Archive it instead." },
        { status: 409 }
      )
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "Product deleted" })
  } catch (error) {
    console.error("[DELETE /api/admin/products/[id]]", error)
    const code = (error as { code?: string } | null)?.code
    if (code === "P2003") {
      return NextResponse.json({ success: false, error: "Cannot delete product — it's still referenced elsewhere. Archive it instead." }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
