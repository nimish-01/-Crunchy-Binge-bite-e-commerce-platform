import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { reviewModerateSchema } from "@/lib/validations/engagement"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body   = await req.json()
  const parsed = reviewModerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const review = await prisma.review.update({
    where: { id },
    data:  parsed.data,
  })

  return NextResponse.json({ success: true, review })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  await prisma.review.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
