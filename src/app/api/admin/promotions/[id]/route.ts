import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { promotionSchema } from "@/lib/validations/promotions"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      products:   { include: { product: true } },
    },
  })
  if (!promotion) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true, promotion })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = promotionSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { categoryIds, productIds, startsAt, endsAt, config, ...rest } = parsed.data

  const promotion = await prisma.$transaction(async (tx) => {
    if (categoryIds !== undefined) {
      await tx.promotionCategory.deleteMany({ where: { promotionId: id } })
      if (categoryIds.length) {
        await tx.promotionCategory.createMany({
          data: categoryIds.map((cid) => ({ promotionId: id, categoryId: cid })),
        })
      }
    }
    if (productIds !== undefined) {
      await tx.promotionProduct.deleteMany({ where: { promotionId: id } })
      if (productIds.length) {
        await tx.promotionProduct.createMany({
          data: productIds.map((pid) => ({ promotionId: id, productId: pid })),
        })
      }
    }

    return tx.promotion.update({
      where: { id },
      data: {
        ...rest,
        ...(config    !== undefined ? { config:   config   as Prisma.InputJsonValue } : {}),
        ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
        ...(endsAt   !== undefined ? { endsAt:   endsAt   ? new Date(endsAt)   : null } : {}),
      },
      include: {
        categories: { include: { category: true } },
        products:   { include: { product: true } },
      },
    })
  })

  revalidateTag("promotions")
  return NextResponse.json({ success: true, promotion })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  await prisma.promotion.delete({ where: { id } })
  revalidateTag("promotions")
  return NextResponse.json({ success: true })
}
