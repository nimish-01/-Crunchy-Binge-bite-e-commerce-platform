import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"
import { reviewSchema } from "@/lib/validations/engagement"
import { earnLoyaltyPoints } from "@/lib/services/loyalty"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId")
  const page      = parseInt(searchParams.get("page") ?? "1", 10)
  const limit     = 10

  if (!productId) {
    return NextResponse.json({ success: false, error: "productId required" }, { status: 400 })
  }

  const where = { productId, status: "APPROVED" }

  const [reviews, total, ratingAgg] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, image: true } },
        helpfulVotes: { select: { helpful: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({
      by: ["rating"],
      where,
      _count: { rating: true },
    }),
  ])

  const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: ratingAgg.find((a) => a.rating === r)?._count.rating ?? 0,
  }))

  const avgRating =
    total > 0
      ? reviews.slice(0, -1).reduce((_, r) => r, reviews[0])
        ? ratingAgg.reduce((sum, a) => sum + a.rating * a._count.rating, 0) / total
        : 0
      : 0

  const sanitized = reviews.map(({ user, isAnonymous, helpfulVotes, ...r }) => ({
    ...r,
    isAnonymous,
    authorName:  isAnonymous ? "Anonymous Customer" : (user?.name ?? "Customer"),
    authorImage: isAnonymous ? null : (user?.image ?? null),
    helpfulCount:    helpfulVotes.filter((v) => v.helpful).length,
    notHelpfulCount: helpfulVotes.filter((v) => !v.helpful).length,
  }))

  return NextResponse.json({
    success: true,
    reviews: sanitized,
    total,
    avgRating: Math.round(avgRating * 10) / 10,
    ratingDistribution,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

export async function POST(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const body   = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { productId, ...data } = parsed.data

  // Verified purchase check
  const hasOrder = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId: session.user.id,
        status: { in: ["DELIVERED", "CONFIRMED", "PACKED", "DISPATCHED"] },
      },
    },
  })
  if (!hasOrder) {
    return NextResponse.json(
      { success: false, error: "Only verified purchasers can leave a review" },
      { status: 403 },
    )
  }

  // One review per product per user
  const existing = await prisma.review.findFirst({
    where: { productId, userId: session.user.id },
  })
  if (existing) {
    return NextResponse.json(
      { success: false, error: "You have already reviewed this product" },
      { status: 409 },
    )
  }

  const review = await prisma.review.create({
    data: {
      ...data,
      productId,
      userId:  session.user.id,
      status:  "PENDING",
    },
  })

  // Award loyalty points for review (fire-and-forget)
  earnLoyaltyPoints(
    session.user.id, 50, "REVIEW", "Points for writing a review", "review", review.id,
  ).catch(() => null)

  return NextResponse.json({ success: true, review }, { status: 201 })
}
