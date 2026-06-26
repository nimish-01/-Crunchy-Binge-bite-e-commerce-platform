import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { analyticsEventSchema } from "@/lib/validations/promotions"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const body = await req.json()
  const parsed = analyticsEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid event" }, { status: 400 })
  }

  const { event } = parsed.data

  await prisma.promotion.update({
    where: { id },
    data:  event === "impression"
      ? { impressions: { increment: 1 } }
      : { clicks:      { increment: 1 } },
  }).catch(() => null) // fire-and-forget; ignore if promotion was deleted

  return NextResponse.json({ success: true })
}
