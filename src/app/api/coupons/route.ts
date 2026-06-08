import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const createSchema = z.object({
  code: z.string().min(1).toUpperCase().trim(),
  type: z.enum(["FLAT", "PERCENTAGE", "FREE_SHIPPING"]),
  value: z.coerce.number().positive(),
  minOrderValue: z.coerce.number().min(0).default(0),
  maxDiscount: z.coerce.number().positive().optional().nullable(),
  totalUsageLimit: z.coerce.number().int().positive().optional().nullable(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  validFrom: z.string(),
  validUntil: z.string(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }
  const d = parsed.data

  const existing = await prisma.coupon.findUnique({ where: { code: d.code } })
  if (existing) {
    return NextResponse.json({ success: false, error: "A coupon with this code already exists" }, { status: 409 })
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: d.code,
      type: d.type,
      value: d.value,
      minOrderValue: d.minOrderValue,
      maxDiscount: d.maxDiscount ?? null,
      totalUsageLimit: d.totalUsageLimit ?? null,
      perUserLimit: d.perUserLimit,
      validFrom: new Date(d.validFrom),
      validUntil: new Date(d.validUntil),
      description: d.description ?? null,
      isActive: d.isActive,
    },
  })

  return NextResponse.json({ success: true, data: { coupon } }, { status: 201 })
}

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { usages: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ success: true, data: { coupons } })
}
