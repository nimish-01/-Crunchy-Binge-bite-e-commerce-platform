import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"
import { wishlistCollectionSchema } from "@/lib/validations/engagement"

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export async function GET(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const collections = await prisma.wishlistCollection.findMany({
    where: { userId: session.user.id },
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
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ success: true, collections })
}

export async function POST(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const body   = await req.json()
  const parsed = wishlistCollectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const slug = slugify(parsed.data.name)
  const collection = await prisma.wishlistCollection.create({
    data: {
      userId:   session.user.id,
      name:     parsed.data.name,
      slug,
      isPublic: parsed.data.isPublic,
    },
  })

  return NextResponse.json({ success: true, collection }, { status: 201 })
}
