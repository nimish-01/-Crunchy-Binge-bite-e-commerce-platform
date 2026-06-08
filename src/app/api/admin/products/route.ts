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
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
