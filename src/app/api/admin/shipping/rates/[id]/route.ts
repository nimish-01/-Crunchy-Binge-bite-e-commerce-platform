import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name:           z.string().min(1).optional(),
  type:           z.enum(["FLAT", "WEIGHT_BASED", "ORDER_VALUE_BASED"]).optional(),
  courierId:      z.string().optional().nullable(),
  minWeightGrams: z.number().int().optional().nullable(),
  maxWeightGrams: z.number().int().optional().nullable(),
  minOrderValue:  z.number().optional().nullable(),
  maxOrderValue:  z.number().optional().nullable(),
  price:          z.number().min(0).optional(),
  isCOD:          z.boolean().optional(),
  isExpress:      z.boolean().optional(),
  isActive:       z.boolean().optional(),
  priority:       z.number().int().optional(),
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

  const rate = await prisma.shippingRate.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ success: true, data: { rate } })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  await prisma.shippingRate.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
