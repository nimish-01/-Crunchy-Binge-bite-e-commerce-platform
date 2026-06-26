import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name:               z.string().min(1),
  website:            z.string().url().optional().or(z.literal("")).optional(),
  trackingUrlPattern: z.string().optional(),
  supportPhone:       z.string().optional(),
  supportEmail:       z.string().email().optional().or(z.literal("")).optional(),
  logo:               z.string().optional(),
  isActive:           z.boolean().optional(),
  priority:           z.number().int().optional(),
})

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const couriers = await prisma.courier.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    include: { _count: { select: { shipments: true } } },
  })

  return NextResponse.json({ success: true, data: { couriers } })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const courier = await prisma.courier.create({ data: parsed.data })
  return NextResponse.json({ success: true, data: { courier } }, { status: 201 })
}
