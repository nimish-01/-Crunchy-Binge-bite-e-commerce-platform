import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? undefined
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { requestedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: {
          select: {
            id: true, orderNumber: true, total: true,
            items: {
              take: 1,
              include: { product: { select: { name: true, images: true } } },
            },
          },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: { items, total, page, pages: Math.ceil(total / PAGE_SIZE) },
  })
}
