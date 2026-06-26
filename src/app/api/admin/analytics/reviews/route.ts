import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { parsePeriod } from "@/lib/services/analytics"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const range = parsePeriod(searchParams)

  const [byStatus, ratingDist, mostReviewed, mostHelpful, avgRating] = await Promise.all([
    prisma.review.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { status: "APPROVED" },
      _count: { id: true },
      orderBy: { rating: "desc" },
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: { status: "APPROVED" },
      _count: { id: true },
      _avg: { rating: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.review.findMany({
      where: { status: "APPROVED", helpfulCount: { gt: 0 } },
      orderBy: { helpfulCount: "desc" },
      take: 5,
      include: {
        product: { select: { name: true, slug: true } },
        user:    { select: { name: true } },
      },
    }),
    prisma.review.aggregate({
      where: { status: "APPROVED" },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ])

  // Enrich with product names
  const productIds = mostReviewed.map((r) => r.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true },
  })
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  const recentInPeriod = await prisma.review.count({
    where: { createdAt: { gte: range.start, lte: range.end } },
  })

  return NextResponse.json({
    success: true,
    range: { start: range.start, end: range.end, label: range.label },
    summary: {
      totalApproved: avgRating._count.id,
      avgRating:     Math.round((avgRating._avg.rating ?? 0) * 10) / 10,
      pending:       byStatus.find((s) => s.status === "PENDING")?._count.id  ?? 0,
      rejected:      byStatus.find((s) => s.status === "REJECTED")?._count.id ?? 0,
      hidden:        byStatus.find((s) => s.status === "HIDDEN")?._count.id   ?? 0,
      newInPeriod:   recentInPeriod,
    },
    ratingDistribution: ratingDist.map((r) => ({ rating: r.rating, count: r._count.id })),
    mostReviewed: mostReviewed.map((r) => ({
      productId: r.productId,
      name:      productMap[r.productId]?.name ?? "—",
      reviews:   r._count.id,
      avgRating: Math.round((r._avg.rating ?? 0) * 10) / 10,
    })),
    mostHelpful: mostHelpful.map((r) => ({
      id:          r.id,
      productName: r.product.name,
      authorName:  r.isAnonymous ? "Anonymous" : (r.user?.name ?? "—"),
      rating:      r.rating,
      helpfulCount: r.helpfulCount,
      body:        r.body?.slice(0, 100) ?? "",
    })),
  })
}
