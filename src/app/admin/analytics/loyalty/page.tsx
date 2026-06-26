import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getDateRange, type AnalyticsPeriod } from "@/lib/services/analytics"
import { Suspense } from "react"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import DateFilter from "@/components/admin/analytics/date-filter"
import KpiCard from "@/components/admin/analytics/kpi-card"
import PieChartWidget from "@/components/admin/analytics/pie-chart-widget"
import BarChartWidget from "@/components/admin/analytics/bar-chart-widget"
import Link from "next/link"
import { Gift, Wallet, Users, TrendingUp } from "lucide-react"

export const metadata = { title: "Loyalty Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function LoyaltyAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d", startDate, endDate } = await searchParams
  const range = getDateRange(period as AnalyticsPeriod, startDate, endDate)

  const [pointsStats, walletStats, topUsers, referralStats, tierDist] = await Promise.all([
    prisma.loyaltyTransaction.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end } },
      _sum: { points: true },
      _count: { id: true },
    }),
    prisma.wallet.aggregate({
      _sum: { balance: true },
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER", loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, loyaltyPoints: true },
    }),
    prisma.referral.count({ where: { createdAt: { gte: range.start, lte: range.end } } }),
    prisma.user.groupBy({
      by: ["loyaltyTier"],
      where: { role: "CUSTOMER" },
      _count: { id: true },
    }),
  ])

  const walletTotal = walletStats._sum.balance ?? 0
  const pointsEarned = pointsStats._sum.points ?? 0

  const tierData = tierDist.map((t) => ({
    name:  t.loyaltyTier ?? "BRONZE",
    value: t._count.id,
  }))

  const topUsersBar = topUsers.slice(0, 8).map((u) => ({
    name:   (u.name ?? u.email ?? "—").slice(0, 16),
    points: u.loyaltyPoints,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loyalty Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
        <Link href="/admin/loyalty" className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">
          Manage Loyalty →
        </Link>
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Points Transacted" value={pointsEarned}           icon={Gift}      color="text-brand-400"  />
        <KpiCard title="Wallet Wallets"    value={walletStats._count.id}  icon={Wallet}    color="text-teal-500"   />
        <KpiCard title="Wallet Balance"    value={walletTotal}            icon={Wallet}    color="text-green-500"  prefix="₹" />
        <KpiCard title="Referrals"         value={referralStats}          icon={Users}     color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartWidget data={tierData} title="Customer Tier Distribution" donut />

        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-sm font-semibold mb-4">Top Customers by Points</p>
          <BarChartWidget
            data={topUsersBar}
            series={[{ key: "points", label: "Points", color: "#f97316" }]}
            horizontal
            height={260}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50">
          <p className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-400" />
            Top 10 Loyalty Members
          </p>
        </div>
        <div className="divide-y divide-border/50">
          {topUsers.map((u, i) => (
            <div key={u.id} className="flex items-center gap-4 px-4 py-3">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <Link href={`/admin/customers/${u.id}`} className="text-sm font-medium hover:underline text-brand-400">
                  {u.name ?? "—"}
                </Link>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <span className="text-sm font-bold">{u.loyaltyPoints.toLocaleString("en-IN")} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
