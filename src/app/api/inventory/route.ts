import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireInventoryAccess, isInventorySession } from "@/lib/api-auth"

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  lowStock: z.string().optional().transform((v) => v === "true"),
  outOfStock: z.string().optional().transform((v) => v === "true"),
  categoryId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const inv = await requireInventoryAccess()
    if (!isInventorySession(inv)) return inv

    const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid query parameters" }, { status: 400 })
    }
    const { page, limit, q, lowStock, outOfStock, categoryId } = parsed.data

    const variantWhere = {
      isActive: true,
      ...(outOfStock ? { stock: 0 } : {}),
      product: {
        status: "ACTIVE" as const,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
    }

    const [allVariants, totalVariants, outOfStockCount] = await Promise.all([
      prisma.productVariant.findMany({
        where: { isActive: true },
        select: { stock: true, lowStockThreshold: true },
      }),
      prisma.productVariant.count({ where: variantWhere }),
      prisma.productVariant.count({ where: { isActive: true, stock: 0 } }),
    ])

    const lowStockCount = allVariants.filter(
      (v) => v.stock > 0 && v.stock <= v.lowStockThreshold
    ).length

    const variantWhereWithLowStock = lowStock
      ? { ...variantWhere, stock: { gt: 0 } }
      : variantWhere

    const variants = await prisma.productVariant.findMany({
      where: variantWhereWithLowStock,
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
      },
      orderBy: { stock: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    const variantsWithStatus = variants
      .map((v) => ({
        ...v,
        isLowStock: v.stock > 0 && v.stock <= v.lowStockThreshold,
        isOutOfStock: v.stock === 0,
      }))
      .filter((v) => !lowStock || v.isLowStock)

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalVariants: allVariants.length,
          lowStockCount,
          outOfStockCount,
          healthyCount: allVariants.length - lowStockCount - outOfStockCount,
        },
        variants: variantsWithStatus,
        pagination: {
          page,
          limit,
          total: lowStock ? lowStockCount : totalVariants,
          totalPages: Math.ceil((lowStock ? lowStockCount : totalVariants) / limit),
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/inventory]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
