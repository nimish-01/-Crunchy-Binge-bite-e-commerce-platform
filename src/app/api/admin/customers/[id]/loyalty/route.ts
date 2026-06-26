import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { loyaltyAdjustSchema } from "@/lib/validations/engagement"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()

  const user = await prisma.user.findUnique({ where: { id, role: "CUSTOMER" } })
  if (!user) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })

  const parsed = loyaltyAdjustSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { points, description } = parsed.data

  if (points < 0 && user.loyaltyPoints + points < 0) {
    return NextResponse.json(
      { success: false, error: "Cannot deduct more points than available" },
      { status: 400 },
    )
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { loyaltyPoints: { increment: points } },
      select: { loyaltyPoints: true },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId: id,
        type: points >= 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
        points,
        description,
      },
    }),
  ])

  return NextResponse.json({ success: true, loyaltyPoints: updatedUser.loyaltyPoints })
}
