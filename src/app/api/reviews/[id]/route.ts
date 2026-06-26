import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"
import { reviewUpdateSchema } from "@/lib/validations/engagement"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const review = await prisma.review.findUnique({
    where: { id },
    include: { user: { select: { name: true, image: true } } },
  })
  if (!review) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, review })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { id } = await params
  const review = await prisma.review.findUnique({ where: { id } })
  if (!review) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  if (review.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }
  if (review.status === "REJECTED") {
    return NextResponse.json({ success: false, error: "Cannot edit a rejected review" }, { status: 400 })
  }

  const body   = await req.json()
  const parsed = reviewUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { ...parsed.data, status: "PENDING" },
  })

  return NextResponse.json({ success: true, review: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { id } = await params
  const review = await prisma.review.findUnique({ where: { id } })
  if (!review) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  if (review.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  await prisma.review.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
