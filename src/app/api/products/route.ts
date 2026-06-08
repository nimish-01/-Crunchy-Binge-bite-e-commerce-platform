import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().optional(),
  search: z.string().optional(),
  featured: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).default("newest"),
})

const productSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  images: true,
  tags: true,
  dietaryTags: true,
  isFeatured: true,
  isSubscriptionEligible: true,
  status: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: { id: true, weight: true, price: true, mrp: true, stock: true, sku: true },
    orderBy: { price: "asc" as const },
  },
  _count: { select: { reviews: { where: { status: "APPROVED" } } } },
} as const

export async function GET(req: NextRequest) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters" },
        { status: 400 }
      )
    }

    const { page, limit, category, search, featured, sort } = parsed.data

    const where = {
      status: "ACTIVE" as const,
      ...(category ? { category: { slug: category } } : {}),
      ...(featured !== undefined ? { isFeatured: featured } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { shortDescription: { contains: search, mode: "insensitive" as const } },
              { tags: { has: search } },
            ],
          }
        : {}),
    }

    // Price sort: fetch all matching, sort in JS, then paginate
    if (sort === "price_asc" || sort === "price_desc") {
      const all = await prisma.product.findMany({ where, select: productSelect })
      const sorted = all
        .filter((p) => p.variants.length > 0)
        .sort((a, b) => {
          const minA = Math.min(...a.variants.map((v) => v.price))
          const minB = Math.min(...b.variants.map((v) => v.price))
          return sort === "price_asc" ? minA - minB : minB - minA
        })
      const total = sorted.length
      return NextResponse.json({
        success: true,
        data: {
          products: sorted.slice((page - 1) * limit, page * limit),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      })
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
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
    console.error("[GET /api/products]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
