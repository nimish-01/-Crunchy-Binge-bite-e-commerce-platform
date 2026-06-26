import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { isActive: true },
  })

  return NextResponse.json({ success: true, isActive: updated.isActive })
}
