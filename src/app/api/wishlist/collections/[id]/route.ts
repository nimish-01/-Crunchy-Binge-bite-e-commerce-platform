import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"
import { wishlistCollectionSchema } from "@/lib/validations/engagement"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collection = await prisma.wishlistCollection.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, images: true,
              variants: { where: { isActive: true }, select: { id: true, weight: true, price: true }, orderBy: { price: "asc" as const }, take: 1 },
            },
          },
        },
      },
    },
  })
  if (!collection) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, collection })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { id } = await params
  const collection = await prisma.wishlistCollection.findUnique({ where: { id } })
  if (!collection || collection.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const body   = await req.json()
  const parsed = wishlistCollectionSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.wishlistCollection.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json({ success: true, collection: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { id } = await params
  const collection = await prisma.wishlistCollection.findUnique({ where: { id } })
  if (!collection || collection.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  await prisma.wishlistCollection.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
