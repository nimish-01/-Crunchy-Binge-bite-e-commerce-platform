import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name:           z.string().min(1),
  type:           z.enum(["FLAT", "WEIGHT_BASED", "ORDER_VALUE_BASED"]),
  courierId:      z.string().optional().nullable(),
  minWeightGrams: z.number().int().optional().nullable(),
  maxWeightGrams: z.number().int().optional().nullable(),
  minOrderValue:  z.number().optional().nullable(),
  maxOrderValue:  z.number().optional().nullable(),
  price:          z.number().min(0),
  isCOD:          z.boolean().optional(),
  isExpress:      z.boolean().optional(),
  isActive:       z.boolean().optional(),
  priority:       z.number().int().optional(),
})

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const rates = await prisma.shippingRate.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    include: { courier: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: { rates } })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const rate = await prisma.shippingRate.create({ data: parsed.data })
  return NextResponse.json({ success: true, data: { rate } }, { status: 201 })
}
