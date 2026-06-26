import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { promotionSchema } from "@/lib/validations/promotions"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") ?? undefined
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = 20

  const where = type ? { type: type as never } : {}

  const [promotions, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      include: {
        categories: { include: { category: { select: { id: true, name: true } } } },
        products:   { include: { product:  { select: { id: true, name: true } } } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.promotion.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    promotions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = promotionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { categoryIds, productIds, startsAt, endsAt, config, ...rest } = parsed.data

  const promotion = await prisma.promotion.create({
    data: {
      ...rest,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt:   endsAt   ? new Date(endsAt)   : null,
      displayPages: rest.displayPages ?? [],
      config: (config ?? {}) as Prisma.InputJsonValue,
      categories: categoryIds.length
        ? { create: categoryIds.map((id) => ({ categoryId: id })) }
        : undefined,
      products: productIds.length
        ? { create: productIds.map((id) => ({ productId: id })) }
        : undefined,
    },
    include: {
      categories: { include: { category: true } },
      products:   { include: { product: true } },
    },
  })

  revalidateTag("promotions")
  return NextResponse.json({ success: true, promotion }, { status: 201 })
}
