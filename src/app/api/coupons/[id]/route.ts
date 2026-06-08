import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const updateSchema = z.object({
  type: z.enum(["FLAT", "PERCENTAGE", "FREE_SHIPPING"]).optional(),
  value: z.coerce.number().positive().optional(),
  minOrderValue: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().positive().nullable().optional(),
  totalUsageLimit: z.coerce.number().int().positive().nullable().optional(),
  perUserLimit: z.coerce.number().int().positive().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const existing = await prisma.coupon.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Coupon not found" }, { status: 404 })

  const d = parsed.data
  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(d.type !== undefined && { type: d.type }),
      ...(d.value !== undefined && { value: d.value }),
      ...(d.minOrderValue !== undefined && { minOrderValue: d.minOrderValue }),
      ...(d.maxDiscount !== undefined && { maxDiscount: d.maxDiscount }),
      ...(d.totalUsageLimit !== undefined && { totalUsageLimit: d.totalUsageLimit }),
      ...(d.perUserLimit !== undefined && { perUserLimit: d.perUserLimit }),
      ...(d.validFrom !== undefined && { validFrom: new Date(d.validFrom) }),
      ...(d.validUntil !== undefined && { validUntil: new Date(d.validUntil) }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
    },
  })

  return NextResponse.json({ success: true, data: { coupon } })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const existing = await prisma.coupon.findUnique({
    where: { id },
    select: { id: true, _count: { select: { usages: true } } },
  })
  if (!existing) return NextResponse.json({ success: false, error: "Coupon not found" }, { status: 404 })

  if (existing._count.usages > 0) {
    // Soft-delete: deactivate instead of hard-deleting to preserve order history
    await prisma.coupon.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true, message: "Coupon deactivated (has existing usages)" })
  }

  await prisma.coupon.delete({ where: { id } })
  return NextResponse.json({ success: true, message: "Coupon deleted" })
}
