import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId") ?? undefined

  const productFilter = categoryId ? { product: { categoryId } } : {}

  const [
    lowStock, outOfStock, totalVariants,
    totalValue, fastMoving, slowMoving,
    deadStock, recentMovements,
  ] = await Promise.all([
    prisma.productVariant.findMany({
      where: { stock: { gt: 0, lte: 10 }, isActive: true, ...productFilter },
      include: { product: { select: { name: true, category: { select: { name: true } } } } },
      orderBy: { stock: "asc" },
      take: 20,
    }),
    prisma.productVariant.findMany({
      where: { stock: 0, isActive: true, ...productFilter },
      include: { product: { select: { name: true, category: { select: { name: true } } } } },
      take: 20,
    }),
    prisma.productVariant.count({ where: { isActive: true, ...productFilter } }),
    prisma.productVariant.findMany({
      where: { isActive: true, ...productFilter },
      select: { stock: true, price: true },
    }),
    // Fast moving — most units sold in last 30 days
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        order: {
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    // Slow moving — least units sold
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        order: {
          createdAt: { gte: new Date(Date.now() - 90 * 86400000) },
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "asc" } },
      take: 10,
    }),
    // Dead stock — variants with stock > 0 but no orders in 90 days
    prisma.productVariant.count({
      where: {
        stock: { gt: 0 },
        isActive: true,
        orderItems: {
          none: {
            order: { createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
          },
        },
      },
    }),
    // Recent inventory logs
    prisma.inventoryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        variant: {
          include: { product: { select: { name: true } } },
        },
      },
    }),
  ])

  const inventoryValue = totalValue.reduce((s, v) => s + v.stock * v.price, 0)

  // Enrich fast/slow with variant info
  const variantIds = [...new Set([...fastMoving.map((f) => f.variantId), ...slowMoving.map((f) => f.variantId)])]
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, weight: true, product: { select: { name: true } } },
  })
  const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]))

  return NextResponse.json({
    success: true,
    summary: {
      totalVariants,
      lowStockCount:  lowStock.length,
      outOfStockCount: outOfStock.length,
      deadStockCount: deadStock,
      inventoryValue: Math.round(inventoryValue),
    },
    lowStock: lowStock.map((v) => ({
      id: v.id, weight: v.weight, stock: v.stock,
      productName: v.product.name,
      category:    v.product.category.name,
    })),
    outOfStock: outOfStock.map((v) => ({
      id: v.id, weight: v.weight,
      productName: v.product.name,
      category:    v.product.category.name,
    })),
    fastMoving: fastMoving.map((f) => ({
      variantId: f.variantId,
      name: `${variantMap[f.variantId]?.product.name ?? "—"} (${variantMap[f.variantId]?.weight ?? "—"})`,
      unitsSold: f._sum.quantity ?? 0,
    })),
    slowMoving: slowMoving.map((f) => ({
      variantId: f.variantId,
      name: `${variantMap[f.variantId]?.product.name ?? "—"} (${variantMap[f.variantId]?.weight ?? "—"})`,
      unitsSold: f._sum.quantity ?? 0,
    })),
    recentMovements: recentMovements.map((log) => ({
      id:          log.id,
      productName: log.variant.product.name,
      weight:      log.variant.weight,
      type:        log.updateType,
      change:      log.quantityChange,
      newQty:      log.newQuantity,
      createdAt:   log.createdAt,
    })),
  })
}
