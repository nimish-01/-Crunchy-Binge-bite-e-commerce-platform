import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { heroSlideSchema } from "@/lib/validations/homepage"

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const slides = await prisma.heroSlide.findMany({
    include: { media: true },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json({ success: true, slides })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = heroSlideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { startsAt, endsAt, mediaId, ...rest } = parsed.data

  const maxOrder = await prisma.heroSlide.aggregate({ _max: { sortOrder: true } })
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

  const slide = await prisma.heroSlide.create({
    data: {
      ...rest,
      sortOrder: nextOrder,
      mediaId:   mediaId ?? null,
      startsAt:  startsAt ? new Date(startsAt) : null,
      endsAt:    endsAt   ? new Date(endsAt)   : null,
    },
    include: { media: true },
  })

  revalidateTag("hero-slides")
  return NextResponse.json({ success: true, slide }, { status: 201 })
}
