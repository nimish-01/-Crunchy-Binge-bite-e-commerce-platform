import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name:                 z.string().min(1).optional(),
  states:               z.array(z.string()).optional(),
  cities:               z.array(z.string()).optional(),
  pincodes:             z.array(z.string()).optional(),
  deliveryCharge:       z.number().min(0).optional(),
  freeDeliveryThreshold: z.number().min(0).optional(),
  estimatedDaysMin:     z.number().int().min(0).optional(),
  estimatedDaysMax:     z.number().int().min(0).optional(),
  expressEnabled:       z.boolean().optional(),
  expressCharge:        z.number().min(0).optional(),
  expressDaysMin:       z.number().int().min(0).optional(),
  expressDaysMax:       z.number().int().min(0).optional(),
  codEnabled:           z.boolean().optional(),
  codMinOrderValue:     z.number().min(0).optional(),
  isActive:             z.boolean().optional(),
  sortOrder:            z.number().int().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const zone = await prisma.deliveryZone.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ success: true, data: { zone } })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  await prisma.deliveryZone.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
