import { prisma } from "@/lib/prisma"

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  })
}

export async function creditWallet(
  userId: string,
  amount: number,
  description: string,
  type: string = "CREDIT",
  refType?: string,
  refId?: string,
) {
  if (amount <= 0) throw new Error("Amount must be positive")

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })

  return prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: { walletId: wallet.id, type, amount, description, refType, refId },
    }),
  ])
}

export async function debitWallet(
  userId: string,
  amount: number,
  description: string,
  type: string = "DEBIT",
  refType?: string,
  refId?: string,
) {
  if (amount <= 0) throw new Error("Amount must be positive")

  const wallet = await prisma.wallet.findUnique({ where: { userId } })
  if (!wallet || wallet.balance < amount) throw new Error("Insufficient wallet balance")

  return prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.walletTransaction.create({
      data: { walletId: wallet.id, type, amount: -amount, description, refType, refId },
    }),
  ])
}
