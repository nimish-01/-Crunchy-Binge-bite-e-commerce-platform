import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { heroSlideSchema } from "@/lib/validations/homepage"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = heroSlideSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { startsAt, endsAt, mediaId, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (mediaId !== undefined) data.mediaId = mediaId ?? null
  if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null
  if (endsAt   !== undefined) data.endsAt   = endsAt   ? new Date(endsAt)   : null

  const slide = await prisma.heroSlide.update({
    where: { id },
    data,
    include: { media: true },
  })

  revalidateTag("hero-slides")
  return NextResponse.json({ success: true, slide })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  await prisma.heroSlide.delete({ where: { id } })

  revalidateTag("hero-slides")
  return NextResponse.json({ success: true })
}
