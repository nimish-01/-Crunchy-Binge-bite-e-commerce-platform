import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id:           true,
      name:         true,
      email:        true,
      phone:        true,
      isActive:     true,
      loyaltyPoints: true,
      loyaltyTier:  true,
      referralCode: true,
      createdAt:    true,
      updatedAt:    true,
      _count: { select: { orders: true, reviews: true, wishlists: true } },
      orders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, orderNumber: true, status: true, subtotal: true,
          paymentStatus: true, createdAt: true,
        },
      },
      wallet: {
        include: {
          transactions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
      loyaltyTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      wishlists: {
        take: 20,
        include: { product: { select: { id: true, name: true, images: true } } },
      },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { id: true, name: true, slug: true } } },
      },
      referralsGiven: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { referee: { select: { name: true, email: true } } },
      },
    },
  })

  if (!user) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, customer: user })
}
