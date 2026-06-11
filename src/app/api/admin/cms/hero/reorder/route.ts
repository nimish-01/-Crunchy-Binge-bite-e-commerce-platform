import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { heroSlideReorderSchema } from "@/lib/validations/homepage"

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = heroSlideReorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  await prisma.$transaction(
    parsed.data.items.map(({ id, sortOrder }) =>
      prisma.heroSlide.update({ where: { id }, data: { sortOrder } })
    )
  )

  revalidateTag("hero-slides")
  return NextResponse.json({ success: true })
}
