import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { id: reviewId } = await params
  const { helpful } = await req.json()

  if (typeof helpful !== "boolean") {
    return NextResponse.json({ success: false, error: "helpful must be a boolean" }, { status: 400 })
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!review) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  if (review.userId === session.user.id) {
    return NextResponse.json({ success: false, error: "Cannot vote on your own review" }, { status: 400 })
  }

  const existing = await prisma.reviewHelpful.findUnique({
    where: { reviewId_userId: { reviewId, userId: session.user.id } },
  })

  if (existing) {
    if (existing.helpful === helpful) {
      await prisma.reviewHelpful.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, action: "removed" })
    }
    await prisma.reviewHelpful.update({ where: { id: existing.id }, data: { helpful } })
    return NextResponse.json({ success: true, action: "updated" })
  }

  await prisma.reviewHelpful.create({
    data: { reviewId, userId: session.user.id, helpful },
  })

  // Keep helpfulCount in sync (fire-and-forget)
  prisma.review.update({
    where: { id: reviewId },
    data: {
      helpfulCount: await prisma.reviewHelpful.count({ where: { reviewId, helpful: true } }),
    },
  }).catch(() => null)

  return NextResponse.json({ success: true, action: "created" })
}
