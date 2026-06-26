import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { parsePeriod } from "@/lib/services/analytics"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const range    = parsePeriod(searchParams)
  const category = searchParams.get("categoryId") ?? undefined

  const orderFilter = {
    order: {
      createdAt: { gte: range.start, lte: range.end },
      status: { notIn: ["CANCELLED" as const, "REFUNDED" as const] },
    },
  }

  const [byRevenue, byWishlist, byReviews, categoryPerf, ratings] = await Promise.all([
    // Best selling by revenue
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { ...orderFilter, ...(category ? { product: { categoryId: category } } : {}) },
      _sum: { totalPrice: true },
      _count: { id: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 20,
    }),
    // Most wishlisted
    prisma.wishlist.groupBy({
      by: ["productId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    // Most reviewed
    prisma.review.groupBy({
      by: ["productId"],
      where: { status: "APPROVED" },
      _count: { id: true },
      _avg: { rating: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    // Category performance
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: orderFilter,
      _sum: { totalPrice: true },
      _count: { id: true },
    }),
    // Highest/lowest rated
    prisma.review.groupBy({
      by: ["productId"],
      where: { status: "APPROVED" },
      _avg: { rating: true },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
      orderBy: { _avg: { rating: "desc" } },
      take: 20,
    }),
  ])

  // Enrich with product info
  const allProductIds = [...new Set([
    ...byRevenue.map((p) => p.productId),
    ...byWishlist.map((p) => p.productId),
    ...byReviews.map((p) => p.productId),
    ...ratings.map((p) => p.productId),
  ])]

  const products = await prisma.product.findMany({
    where: { id: { in: allProductIds } },
    select: { id: true, name: true, slug: true, images: true, category: { select: { name: true } } },
  })
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  // Category aggregation
  const catRevMap: Record<string, { name: string; revenue: number; orders: number }> = {}
  for (const item of categoryPerf) {
    const prod = productMap[item.productId]
    if (!prod) continue
    const catName = prod.category.name
    if (!catRevMap[catName]) catRevMap[catName] = { name: catName, revenue: 0, orders: 0 }
    catRevMap[catName].revenue += item._sum.totalPrice ?? 0
    catRevMap[catName].orders  += item._count.id
  }

  return NextResponse.json({
    success: true,
    range: { start: range.start, end: range.end, label: range.label },
    bestSelling: byRevenue.slice(0, 10).map((p) => ({
      productId: p.productId,
      name:    productMap[p.productId]?.name ?? "—",
      image:   productMap[p.productId]?.images[0] ?? null,
      revenue: p._sum.totalPrice ?? 0,
      units:   p._count.id,
    })),
    worstSelling: byRevenue.slice(-5).reverse().map((p) => ({
      productId: p.productId,
      name:    productMap[p.productId]?.name ?? "—",
      revenue: p._sum.totalPrice ?? 0,
      units:   p._count.id,
    })),
    mostWishlisted: byWishlist.map((p) => ({
      productId: p.productId,
      name:    productMap[p.productId]?.name ?? "—",
      count:   p._count.id,
    })),
    mostReviewed: byReviews.map((p) => ({
      productId: p.productId,
      name:      productMap[p.productId]?.name ?? "—",
      reviews:   p._count.id,
      avgRating: Math.round((p._avg.rating ?? 0) * 10) / 10,
    })),
    highestRated: ratings.slice(0, 5).map((p) => ({
      productId: p.productId,
      name:      productMap[p.productId]?.name ?? "—",
      avgRating: Math.round((p._avg.rating ?? 0) * 10) / 10,
      reviews:   p._count.id,
    })),
    lowestRated: ratings.slice(-5).reverse().map((p) => ({
      productId: p.productId,
      name:      productMap[p.productId]?.name ?? "—",
      avgRating: Math.round((p._avg.rating ?? 0) * 10) / 10,
      reviews:   p._count.id,
    })),
    categoryPerformance: Object.values(catRevMap).sort((a, b) => b.revenue - a.revenue),
  })
}
