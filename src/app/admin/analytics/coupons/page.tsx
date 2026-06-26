import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getDateRange, type AnalyticsPeriod } from "@/lib/services/analytics"
import { Suspense } from "react"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import DateFilter from "@/components/admin/analytics/date-filter"
import KpiCard from "@/components/admin/analytics/kpi-card"
import BarChartWidget from "@/components/admin/analytics/bar-chart-widget"
import Link from "next/link"
import { Ticket, TrendingDown, CheckCircle, XCircle } from "lucide-react"

export const metadata = { title: "Coupon Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function CouponsAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d", startDate, endDate } = await searchParams
  const range = getDateRange(period as AnalyticsPeriod, startDate, endDate)

  const [topCoupons, summary] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: { usageCount: "desc" },
      take: 10,
      select: { id: true, code: true, usageCount: true, totalUsageLimit: true, type: true, value: true, isActive: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        couponId: { not: null },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _sum: { discountAmount: true },
      _count: { id: true },
    }),
  ])

  const [activeCoupons, expiredCoupons] = await Promise.all([
    prisma.coupon.count({ where: { isActive: true } }),
    prisma.coupon.count({ where: { isActive: false } }),
  ])

  const totalDiscount = summary._sum.discountAmount ?? 0
  const couponOrders  = summary._count.id

  const barData = topCoupons.map((c) => ({
    name:  c.code,
    uses:  c.usageCount,
    limit: c.totalUsageLimit ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Coupon Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
        <Link href="/admin/coupons" className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">
          Manage Coupons →
        </Link>
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active Coupons"    value={activeCoupons}  icon={CheckCircle}  color="text-green-500"  />
        <KpiCard title="Expired / Paused" value={expiredCoupons} icon={XCircle}      color="text-red-500"    />
        <KpiCard title="Orders with Coupons" value={couponOrders} icon={Ticket}      color="text-brand-400"  />
        <KpiCard title="Total Discounts"  value={totalDiscount}  icon={TrendingDown} color="text-orange-500" prefix="₹" />
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <p className="text-sm font-semibold mb-4">Top Coupons by Usage</p>
        <BarChartWidget
          data={barData}
          series={[{ key: "uses", label: "Uses", color: "#f97316" }]}
          horizontal
          height={300}
        />
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50">
          <p className="text-sm font-semibold">Coupon Leaderboard</p>
        </div>
        <div className="divide-y divide-border/50">
          {topCoupons.map((c, i) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
              <span className="font-mono text-sm font-semibold text-brand-400 flex-1">{c.code}</span>
              <div className="text-right">
                <p className="text-sm font-medium">{c.usageCount} uses</p>
                <p className="text-xs text-muted-foreground">
                  {c.type === "PERCENTAGE" ? `${c.value}% off` : `₹${c.value} off`}
                  {c.totalUsageLimit ? ` / ${c.totalUsageLimit}` : ""}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"}`}>
                {c.isActive ? "Active" : "Off"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
