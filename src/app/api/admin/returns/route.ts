import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!isAdminSession(session)) return session

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? undefined
    const cursor = searchParams.get("cursor") ?? undefined

    const where = status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" } : {}

    const items = await prisma.returnRequest.findMany({
      where,
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { requestedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true, total: true, deliveredAt: true } },
      },
    })

    const hasNextPage = items.length > PAGE_SIZE
    const data = hasNextPage ? items.slice(0, PAGE_SIZE) : items

    return NextResponse.json({
      success: true,
      data: { items: data, nextCursor: hasNextPage ? data[data.length - 1].id : null },
    })
  } catch (error) {
    console.error("[GET /api/admin/returns]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
