import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { loyaltySettingsSchema } from "@/lib/validations/engagement"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const settings = await prisma.loyaltySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  })

  return NextResponse.json({ success: true, settings })
}

export async function PATCH(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body   = await req.json()
  const parsed = loyaltySettingsSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const settings = await prisma.loyaltySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  })

  return NextResponse.json({ success: true, settings })
}
