import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { walletCreditSchema } from "@/lib/validations/engagement"
import { creditWallet, debitWallet } from "@/lib/services/wallet"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()

  const user = await prisma.user.findUnique({ where: { id, role: "CUSTOMER" } })
  if (!user) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })

  const parsed = walletCreditSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { amount, description, refType, refId } = parsed.data
  const type = body.type === "DEBIT" ? "DEBIT" : "ADMIN_CREDIT"

  try {
    if (type === "DEBIT") {
      await debitWallet(id, amount, description, "ADMIN_DEBIT", refType, refId)
    } else {
      await creditWallet(id, amount, description, "ADMIN_CREDIT", refType, refId)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transaction failed"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: id } })
  return NextResponse.json({ success: true, balance: wallet?.balance ?? 0 })
}
