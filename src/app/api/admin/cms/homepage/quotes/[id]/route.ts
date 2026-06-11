import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { homepageQuoteSchema } from "@/lib/validations/homepage"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = homepageQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const quote = await prisma.homepageQuote.update({
    where: { id },
    data: parsed.data,
  })
  revalidateTag("homepage-cms")

  return NextResponse.json({ success: true, quote })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  await prisma.homepageQuote.delete({ where: { id } })
  revalidateTag("homepage-cms")

  return NextResponse.json({ success: true })
}
