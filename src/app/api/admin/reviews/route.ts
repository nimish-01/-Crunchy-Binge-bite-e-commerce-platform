import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const status  = searchParams.get("status") ?? undefined
  const page    = parseInt(searchParams.get("page") ?? "1", 10)
  const limit   = 20
  const search  = searchParams.get("search") ?? ""

  const where: Record<string, unknown> = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body:  { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: where as never,
      include: {
        user:    { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: where as never }),
  ])

  return NextResponse.json({
    success: true,
    reviews,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
