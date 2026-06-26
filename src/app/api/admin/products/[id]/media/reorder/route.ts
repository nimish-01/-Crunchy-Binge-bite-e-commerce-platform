import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

interface Context { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Context) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session
  await params
  const body = await req.json().catch(() => ({}))
  const { items } = body as { items?: { id: string; sortOrder: number }[] }
  if (!Array.isArray(items)) return NextResponse.json({ success: false, error: "items array required" }, { status: 400 })

  await prisma.$transaction(
    items.map(({ id, sortOrder }) =>
      prisma.productMedia.update({ where: { id }, data: { sortOrder } })
    )
  )

  return NextResponse.json({ success: true })
}
