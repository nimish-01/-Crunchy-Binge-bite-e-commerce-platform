import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const search  = searchParams.get("search") ?? ""
  const page    = parseInt(searchParams.get("page") ?? "1", 10)
  const limit   = 20
  const status  = searchParams.get("status") // "active" | "suspended"

  const where: Record<string, unknown> = {
    role: "CUSTOMER",
    ...(search
      ? {
          OR: [
            { name:  { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status === "active"    ? { isActive: true }  : {}),
    ...(status === "suspended" ? { isActive: false } : {}),
  }

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where: where as never,
      select: {
        id:           true,
        name:         true,
        email:        true,
        phone:        true,
        isActive:     true,
        loyaltyPoints: true,
        loyaltyTier:  true,
        createdAt:    true,
        _count: {
          select: { orders: true, reviews: true, wishlists: true },
        },
        wallet: { select: { balance: true } },
        orders: {
          where: { status: "DELIVERED" },
          select: { subtotal: true },
          take: 100,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where: where as never }),
  ])

  const enriched = customers.map((c) => ({
    ...c,
    totalSpent: c.orders.reduce((sum, o) => sum + o.subtotal, 0),
    walletBalance: c.wallet?.balance ?? 0,
    orders: undefined,
    wallet: undefined,
  }))

  return NextResponse.json({
    success: true,
    customers: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
