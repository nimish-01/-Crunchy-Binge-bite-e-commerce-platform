import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { productSchema } from "@/lib/validations/product"
import { slugify } from "@/lib/utils"
import type { ProductStatus } from "@prisma/client"

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  categoryId: z.string().optional(),
  featured: z.string().optional().transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
})

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid query parameters" }, { status: 400 })
    }
    const { page, limit, q, status, categoryId, featured } = parsed.data

    const where = {
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { slug: { contains: q, mode: "insensitive" as const } },
      ]} : {}),
      ...(status ? { status: status as ProductStatus } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(featured !== undefined ? { isFeatured: featured } : {}),
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isActive: true },
            select: { id: true, weight: true, price: true, mrp: true, sku: true, stock: true, isActive: true },
            orderBy: { price: "asc" },
          },
          _count: { select: { reviews: true, orderItems: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/products]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const body = await req.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { variants, slug, ...productData } = parsed.data

    // Auto-generate slug if not provided or normalize
    const finalSlug = slug || slugify(productData.name)

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug: finalSlug } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A product with this slug already exists" }, { status: 409 })
    }

    // Reject duplicate SKUs within the submission itself
    const skuCounts = new Map<string, number>()
    for (const v of variants) {
      if (!v.sku) continue
      skuCounts.set(v.sku, (skuCounts.get(v.sku) ?? 0) + 1)
    }
    const dupeSku = [...skuCounts.entries()].find(([, count]) => count > 1)?.[0]
    if (dupeSku) {
      return NextResponse.json({ success: false, error: `Duplicate SKU "${dupeSku}" — each variant needs a unique SKU.` }, { status: 400 })
    }

    // Reject SKUs already claimed by another product (SKU is globally unique)
    const skusInUse = await prisma.productVariant.findMany({
      where: { sku: { in: variants.map((v) => v.sku).filter(Boolean) } },
      select: { sku: true },
    })
    if (skusInUse.length > 0) {
      return NextResponse.json({ success: false, error: `SKU "${skusInUse[0].sku}" is already used by another product.` }, { status: 409 })
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: { ...productData, slug: finalSlug },
      })

      await tx.productVariant.createMany({
        data: variants.map((v) => ({
          ...v,
          productId: newProduct.id,
          sku: v.sku || `${newProduct.id}-${v.weight}`.toLowerCase().replace(/\s/g, ""),
        })),
      })

      // Exactly one active variant must be the "default" — auto-correct to
      // the cheapest active variant if the submission left zero or more
      // than one set.
      const activeVariants = await tx.productVariant.findMany({ where: { productId: newProduct.id, isActive: true } })
      const defaultCount = activeVariants.filter((v) => v.isDefault).length
      if (activeVariants.length > 0 && defaultCount !== 1) {
        const cheapest = [...activeVariants].sort((a, b) => a.price - b.price)[0]
        await tx.productVariant.updateMany({ where: { productId: newProduct.id, isActive: true }, data: { isDefault: false } })
        await tx.productVariant.update({ where: { id: cheapest.id }, data: { isDefault: true } })
      }

      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: { orderBy: { price: "asc" } },
        },
      })
    }, { timeout: 15000, maxWait: 5000 })

    return NextResponse.json(
      { success: true, data: { product }, message: "Product created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/admin/products]", error)
    const code = (error as { code?: string } | null)?.code
    if (code === "P2002") {
      return NextResponse.json({ success: false, error: "A product or variant with this slug/SKU already exists." }, { status: 409 })
    }
    if (code === "P2003") {
      return NextResponse.json({ success: false, error: "Invalid category selected." }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
