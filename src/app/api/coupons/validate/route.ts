import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { validateCoupon } from "@/lib/coupon"

const schema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  subtotal: z.coerce.number().min(0),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Please log in to apply a coupon" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { code, subtotal } = parsed.data
    const result = await validateCoupon(code, session.user.id, subtotal)

    // Return full coupon object so cart context can store it for display
    const coupon = await import("@/lib/prisma").then((m) =>
      m.prisma.coupon.findUnique({ where: { id: result.couponId } })
    )

    return NextResponse.json({
      success: true,
      data: { coupon, discountAmount: result.discountAmount, isFreeShipping: result.isFreeShipping },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Invalid coupon"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
