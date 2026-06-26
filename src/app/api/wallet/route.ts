import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"

export async function GET(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { searchParams } = new URL(req.url)
  const page  = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = 20

  const wallet = await prisma.wallet.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      },
    },
  })

  const total = await prisma.walletTransaction.count({ where: { walletId: wallet.id } })

  return NextResponse.json({
    success: true,
    balance: wallet.balance,
    transactions: wallet.transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
