import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getDateRange, toNum, type AnalyticsPeriod } from "@/lib/services/analytics"
import { Prisma } from "@prisma/client"
import { Suspense } from "react"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import DateFilter from "@/components/admin/analytics/date-filter"
import KpiCard from "@/components/admin/analytics/kpi-card"
import AreaChartWidget from "@/components/admin/analytics/area-chart-widget"
import BarChartWidget from "@/components/admin/analytics/bar-chart-widget"
import PieChartWidget from "@/components/admin/analytics/pie-chart-widget"
import { ShoppingBag, CheckCircle, XCircle, RotateCcw, TrendingUp } from "lucide-react"

export const metadata = { title: "Orders Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function OrdersAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d", startDate, endDate } = await searchParams
  const range   = getDateRange(period as AnalyticsPeriod, startDate, endDate)
  const truncFn = range.bucket === "month" ? "month" : "day"

  const [trend, byStatus, byPayment, totals] = await Promise.all([
    prisma.$queryRaw<{ period: Date; orders: bigint }[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata') AS period,
          COUNT(*) AS orders
        FROM "Order"
        WHERE "createdAt" >= ${range.start} AND "createdAt" <= ${range.end}
        GROUP BY 1 ORDER BY 1 ASC
      `
    ),
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
      _sum: { subtotal: true },
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
      _avg: { subtotal: true },
    }),
  ])

  const total     = totals._count.id
  const delivered = byStatus.find((s) => s.status === "DELIVERED")?._count.id ?? 0
  const cancelled = byStatus.find((s) => s.status === "CANCELLED")?._count.id ?? 0
  const returned  = byStatus.find((s) => s.status === "REFUNDED")?._count.id  ?? 0

  const chartTrend = trend.map((r) => ({ period: r.period.toISOString(), orders: toNum(r.orders) }))
  const statusData = byStatus.map((s) => ({ name: s.status, value: s._count.id }))
  const payData    = byPayment.map((p) => ({ name: p.paymentMethod ?? "UNKNOWN", value: p._count.id }))
  const statusBar  = byStatus.map((s) => ({ name: s.status, count: s._count.id, revenue: s._sum.subtotal ?? 0 }))

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Orders"    value={total}     icon={ShoppingBag} color="text-brand-400" />
        <KpiCard title="Delivered"       value={delivered} icon={CheckCircle} color="text-green-500"  subtitle={pct(delivered)} />
        <KpiCard title="Cancelled"       value={cancelled} icon={XCircle}     color="text-red-500"    subtitle={pct(cancelled)} />
        <KpiCard title="Avg Order Value" value={totals._avg.subtotal ?? 0} icon={TrendingUp} color="text-purple-500" prefix="₹" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiCard title="Success Rate"  value={total > 0 ? ((delivered / total) * 100).toFixed(1) : "0"} suffix="%" icon={CheckCircle} color="text-green-500" />
        <KpiCard title="Cancel Rate"   value={total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0"} suffix="%" icon={XCircle}     color="text-red-500" />
        <KpiCard title="Return Rate"   value={total > 0 ? ((returned  / total) * 100).toFixed(1) : "0"} suffix="%" icon={RotateCcw}   color="text-orange-500" />
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <p className="text-sm font-semibold mb-4">Orders Trend</p>
        <AreaChartWidget
          data={chartTrend}
          series={[{ key: "orders", label: "Orders", color: "#f97316" }]}
          bucket={range.bucket}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartWidget data={statusData}  title="Orders by Status"         donut />
        <PieChartWidget data={payData}     title="Orders by Payment Method" donut />
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <p className="text-sm font-semibold mb-4">Revenue by Status</p>
        <BarChartWidget
          data={statusBar}
          series={[{ key: "count", label: "Orders", color: "#3b82f6" }, { key: "revenue", label: "Revenue (₹)", color: "#f97316" }]}
          height={240}
        />
      </div>
    </div>
  )
}
