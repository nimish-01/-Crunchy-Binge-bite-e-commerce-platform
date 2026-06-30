import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Wallet, TrendingUp, TrendingDown } from "lucide-react"

export const metadata = { title: "My Wallet — Crunchy Bingebite" }

export default async function WalletPage() {
  const session = await auth()

  const wallet = await prisma.wallet.upsert({
    where: { userId: session!.user.id },
    create: { userId: session!.user.id },
    update: {},
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Wallet</h1>

      {/* Balance card */}
      <div className="rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/30 p-6">
        <div className="flex items-center gap-3 mb-1">
          <Wallet className="h-5 w-5 text-brand-400" />
          <span className="text-sm text-muted-foreground">Available Balance</span>
        </div>
        <p className="text-4xl font-bold">₹{wallet.balance.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Wallet balance is applied automatically at checkout
        </p>
      </div>

      {/* Transaction history */}
      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-5 border-b border-border/50">
          <h2 className="font-semibold">Transaction History</h2>
        </div>
        <div className="divide-y divide-border/50">
          {wallet.transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-4 p-4">
              <div className={`p-2 rounded-full ${t.amount >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {t.amount >= 0
                  ? <TrendingUp className="h-4 w-4 text-green-500" />
                  : <TrendingDown className="h-4 w-4 text-red-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground capitalize">{t.type.toLowerCase().replace(/_/g, " ")}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${t.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {t.amount >= 0 ? "+" : ""}₹{Math.abs(t.amount).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          ))}
          {wallet.transactions.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Wallet className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Your wallet activity will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
