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
import PieChartWidget from "@/components/admin/analytics/pie-chart-widget"
import ExportButton from "@/components/admin/analytics/export-button"
import { TrendingUp, ShoppingBag, Ticket, RotateCcw, AlertTriangle } from "lucide-react"

export const metadata = { title: "Revenue Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function RevenueAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d", startDate, endDate } = await searchParams
  const range = getDateRange(period as AnalyticsPeriod, startDate, endDate)
  const truncFn = range.bucket === "hour" ? "hour" : range.bucket === "month" ? "month" : "day"

  const [trend, summary, byPayment, refunds] = await Promise.all([
    prisma.$queryRaw<{ period: Date; revenue: number; orders: bigint; discounts: number }[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata') AS period,
          COALESCE(SUM("subtotal"), 0)::float AS revenue,
          COUNT(*) AS orders,
          COALESCE(SUM("discountAmount"), 0)::float AS discounts
        FROM "Order"
        WHERE "createdAt" >= ${range.start}
          AND "createdAt" <= ${range.end}
          AND "status" NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY 1 ORDER BY 1 ASC
      `
    ),
    prisma.order.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { subtotal: true, discountAmount: true, deliveryCharge: true },
      _count: { id: true },
      _avg: { subtotal: true },
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: range.start, lte: range.end }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { subtotal: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end }, status: "REFUNDED" },
      _sum: { subtotal: true },
      _count: { id: true },
    }),
  ])

  const gross     = summary._sum.subtotal       ?? 0
  const discounts = summary._sum.discountAmount ?? 0
  const shipping  = summary._sum.deliveryCharge ?? 0
  const net       = gross - discounts
  const aov       = summary._avg.subtotal       ?? 0

  const chartTrend = trend.map((r) => ({
    period:    r.period.toISOString(),
    revenue:   toNum(r.revenue),
    orders:    toNum(r.orders),
    discounts: toNum(r.discounts),
  }))

  const paymentPie = byPayment.map((p) => ({
    name:  p.paymentMethod ?? "UNKNOWN",
    value: p._sum.subtotal ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Revenue Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
        <ExportButton type="sales" period={period} />
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Gross Revenue"    value={gross}     icon={TrendingUp}    color="text-green-500"  prefix="₹" />
        <KpiCard title="Net Revenue"      value={net}       icon={TrendingUp}    color="text-blue-500"   prefix="₹" />
        <KpiCard title="Avg Order Value"  value={aov}       icon={ShoppingBag}   color="text-purple-500" prefix="₹" />
        <KpiCard title="Total Orders"     value={summary._count.id} icon={ShoppingBag} color="text-brand-400" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Discounts Given"  value={discounts} icon={Ticket}        color="text-orange-500" prefix="₹" />
        <KpiCard title="Shipping Revenue" value={shipping}  icon={TrendingUp}    color="text-teal-500"   prefix="₹" />
        <KpiCard title="Refunds Value"    value={refunds._sum.subtotal ?? 0} icon={RotateCcw} color="text-red-500" prefix="₹" />
        <KpiCard title="Refund Count"     value={refunds._count.id}          icon={AlertTriangle} color="text-red-400" />
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <p className="text-sm font-semibold mb-4">Revenue Trend</p>
        <AreaChartWidget
          data={chartTrend}
          series={[
            { key: "revenue",   label: "Revenue",   color: "#f97316" },
            { key: "discounts", label: "Discounts", color: "#ef4444" },
          ]}
          bucket={range.bucket}
          prefix="₹"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-sm font-semibold mb-4">Orders Trend</p>
          <AreaChartWidget
            data={chartTrend}
            series={[{ key: "orders", label: "Orders", color: "#3b82f6" }]}
            bucket={range.bucket}
          />
        </div>
        <PieChartWidget data={paymentPie} title="Revenue by Payment Method" prefix="₹" donut />
      </div>
    </div>
  )
}
