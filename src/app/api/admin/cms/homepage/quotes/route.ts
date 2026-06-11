import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { homepageQuoteSchema } from "@/lib/validations/homepage"

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const quotes = await prisma.homepageQuote.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })
  return NextResponse.json({ success: true, quotes })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = homepageQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const quote = await prisma.homepageQuote.create({ data: parsed.data })
  revalidateTag("homepage-cms")

  return NextResponse.json({ success: true, quote }, { status: 201 })
}
