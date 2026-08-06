import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

interface Context { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Context) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session
  const { id: productId } = await params
  const body = await req.json().catch(() => ({}))
  const { items } = body as { items?: { id: string; sortOrder: number }[] }
  if (!Array.isArray(items)) return NextResponse.json({ success: false, error: "items array required" }, { status: 400 })

  // updateMany's where clause (not just `id`) ensures a media id can only be
  // reordered within the product it actually belongs to.
  await prisma.$transaction(
    items.map(({ id, sortOrder }) =>
      prisma.productMedia.updateMany({ where: { id, productId }, data: { sortOrder } })
    )
  )

  return NextResponse.json({ success: true })
}
