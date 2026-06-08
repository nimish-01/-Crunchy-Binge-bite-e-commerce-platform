import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { computeDiscount } from "@/lib/coupon"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const subtotal = Math.max(0, parseFloat(searchParams.get("subtotal") ?? "0"))
    const now = new Date()

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        _count: { select: { usages: true } },
        usages: { where: { userId: session.user.id }, select: { id: true } },
      },
    })

    const suggestions = coupons
      .filter((c) => {
        if (c.totalUsageLimit !== null && c._count.usages >= c.totalUsageLimit) return false
        if (c.usages.length >= c.perUserLimit) return false
        return true
      })
      .map((c) => {
        const gap = Math.max(0, c.minOrderValue - subtotal)
        const applicable = gap === 0
        // For PERCENTAGE/FLAT: show savings at current subtotal if applicable, else at minOrderValue threshold
        const previewAt = applicable ? subtotal : c.minOrderValue
        const discountPreview = c.type === "FREE_SHIPPING"
          ? 0
          : computeDiscount(c.type, c.value, c.maxDiscount, previewAt)
        return {
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          maxDiscount: c.maxDiscount,
          minOrderValue: c.minOrderValue,
          description: c.description,
          applicable,
          gap: Math.round(gap * 100) / 100,
          discountPreview,
        }
      })
      // Applicable coupons first, then by smallest gap
      .sort((a, b) => {
        if (a.applicable !== b.applicable) return a.applicable ? -1 : 1
        return a.gap - b.gap
      })
      .slice(0, 5)

    return NextResponse.json({ success: true, data: { suggestions } })
  } catch (error) {
    console.error("[GET /api/coupons/available]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
