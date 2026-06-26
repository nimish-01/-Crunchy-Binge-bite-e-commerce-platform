import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const current = await prisma.promotion.findUnique({ where: { id }, select: { isActive: true } })
  if (!current) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const promotion = await prisma.promotion.update({
    where: { id },
    data: { isActive: !current.isActive },
  })

  revalidateTag("promotions")
  return NextResponse.json({ success: true, promotion })
}
