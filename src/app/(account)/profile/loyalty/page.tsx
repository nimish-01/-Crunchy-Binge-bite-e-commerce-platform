import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getLoyaltySettings } from "@/lib/services/loyalty"
import { Gift, TrendingUp, TrendingDown, Star } from "lucide-react"

export const metadata = { title: "Loyalty Points — Crunchy Bingebite" }

export default async function LoyaltyPage() {
  const session = await auth()

  const [user, settings, transactions, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { loyaltyPoints: true, loyaltyTier: true },
    }),
    getLoyaltySettings(),
    prisma.loyaltyTransaction.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.loyaltyTransaction.count({ where: { userId: session!.user.id } }),
  ])

  const tierThresholds: Record<string, number> = {
    BRONZE: 0, SILVER: 1000, GOLD: 5000, PLATINUM: 20000,
  }
  const tierOrder = ["BRONZE", "SILVER", "GOLD", "PLATINUM"]
  const currentTierIdx = tierOrder.indexOf(user?.loyaltyTier ?? "BRONZE")
  const nextTier = tierOrder[currentTierIdx + 1]
  const nextTierPoints = nextTier ? tierThresholds[nextTier] : null
  const progress = nextTierPoints
    ? Math.min(100, ((user?.loyaltyPoints ?? 0) / nextTierPoints) * 100)
    : 100

  const tierColors: Record<string, string> = {
    BRONZE: "text-amber-600", SILVER: "text-slate-400",
    GOLD: "text-yellow-500", PLATINUM: "text-cyan-400",
  }

  const walletValue = ((user?.loyaltyPoints ?? 0) * settings.redemptionRate).toFixed(2)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Loyalty Rewards</h1>

      {/* Points overview */}
      <div className="rounded-xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-transparent p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-5 w-5 text-brand-400" />
              <span className={`font-bold text-lg ${tierColors[user?.loyaltyTier ?? "BRONZE"]}`}>
                {user?.loyaltyTier ?? "BRONZE"}
              </span>
            </div>
            <p className="text-4xl font-bold">{user?.loyaltyPoints ?? 0} <span className="text-lg font-normal text-muted-foreground">points</span></p>
            <p className="text-sm text-muted-foreground mt-1">≈ ₹{walletValue} redeemable value</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Earn rate</p>
            <p className="font-bold">{settings.pointsPerRupee} pt/₹</p>
          </div>
        </div>

        {/* Tier progress */}
        {nextTier && nextTierPoints && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{user?.loyaltyTier}</span>
              <span>{nextTier} at {nextTierPoints.toLocaleString()} pts</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {(nextTierPoints - (user?.loyaltyPoints ?? 0)).toLocaleString()} more points to {nextTier}
            </p>
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-brand-400" />How to Earn Points</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "Every ₹1 spent", value: `${settings.pointsPerRupee} pts` },
            { label: "Write a review", value: `${settings.reviewPoints} pts` },
            { label: "Refer a friend", value: `${settings.referralReferrerPoints} pts` },
            { label: "Birthday bonus", value: `${settings.birthdayPoints} pts` },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold text-brand-400">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Redeem at up to {settings.maxRedemptionPercent}% off per order. ₹{settings.redemptionRate} value per point.
        </p>
      </div>

      {/* Transaction history */}
      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-5 border-b border-border/50">
          <h2 className="font-semibold">Points History ({total} transactions)</h2>
        </div>
        <div className="divide-y divide-border/50">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-4 p-4">
              <div className={`p-2 rounded-full ${t.points >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {t.points >= 0
                  ? <TrendingUp className="h-4 w-4 text-green-500" />
                  : <TrendingDown className="h-4 w-4 text-red-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground capitalize">{t.type.toLowerCase().replace(/_/g, " ")}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${t.points >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {t.points >= 0 ? "+" : ""}{t.points} pts
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Gift className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>No points yet</p>
              <p className="text-sm mt-1">Start shopping to earn your first points</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
