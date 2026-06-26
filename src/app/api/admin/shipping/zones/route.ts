import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name:                 z.string().min(1),
  states:               z.array(z.string()).optional(),
  cities:               z.array(z.string()).optional(),
  pincodes:             z.array(z.string()),
  deliveryCharge:       z.number().min(0),
  freeDeliveryThreshold: z.number().min(0),
  estimatedDaysMin:     z.number().int().min(0),
  estimatedDaysMax:     z.number().int().min(0),
  expressEnabled:       z.boolean().optional(),
  expressCharge:        z.number().min(0).optional(),
  expressDaysMin:       z.number().int().min(0).optional(),
  expressDaysMax:       z.number().int().min(0).optional(),
  codEnabled:           z.boolean().optional(),
  codMinOrderValue:     z.number().min(0).optional(),
  isActive:             z.boolean().optional(),
  sortOrder:            z.number().int().optional(),
})

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const zones = await prisma.deliveryZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ success: true, data: { zones } })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const zone = await prisma.deliveryZone.create({ data: parsed.data })
  return NextResponse.json({ success: true, data: { zone } }, { status: 201 })
}
