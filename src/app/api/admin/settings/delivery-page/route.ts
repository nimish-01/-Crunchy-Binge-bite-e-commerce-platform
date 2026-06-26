import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { z } from "zod"

const schema = z.object({
  deliveryHeadline:    z.string().min(1).max(200),
  deliveryMessage:     z.string().min(1).max(500),
  deliveryAnimation:   z.enum(["CONFETTI", "FIREWORKS", "STARS", "NONE"]),
  deliveryShowRating:  z.boolean(),
  deliveryShowReorder: z.boolean(),
})

export async function PATCH(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const settings = await prisma.siteSettings.upsert({
    where:  { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  })

  return NextResponse.json({ success: true, settings })
}

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json({ success: true, settings })
}
