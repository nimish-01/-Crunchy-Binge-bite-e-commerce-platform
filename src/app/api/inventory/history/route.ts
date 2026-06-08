import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireInventoryAccess, isInventorySession } from "@/lib/api-auth"

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  variantId: z.string().optional(),
  updateType: z.string().optional(),
  reason: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const inv = await requireInventoryAccess()
    if (!isInventorySession(inv)) return inv

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid query parameters" }, { status: 400 })
    }
    const { page, limit, q, variantId, updateType, reason, from, to } = parsed.data

    const where: Record<string, unknown> = {}

    if (variantId) where.variantId = variantId
    if (updateType) where.updateType = updateType
    if (reason) where.reason = reason
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }
    if (q) {
      where.variant = {
        product: { name: { contains: q, mode: "insensitive" } },
      }
    }

    const [total, logs] = await Promise.all([
      prisma.inventoryLog.count({ where }),
      prisma.inventoryLog.findMany({
        where,
        include: {
          variant: {
            select: {
              id: true,
              weight: true,
              sku: true,
              product: { select: { id: true, name: true, slug: true } },
            },
          },
          updatedByUser: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error("[GET /api/inventory/history]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
