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
import Link from "next/link"
import { Users, TrendingUp, UserCheck, ShoppingBag } from "lucide-react"

export const metadata = { title: "Customer Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function CustomersAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d", startDate, endDate } = await searchParams
  const range   = getDateRange(period as AnalyticsPeriod, startDate, endDate)
  const truncFn = range.bucket === "month" ? "month" : "day"

  const [growth, totals, repeatBuyers, topCustomers] = await Promise.all([
    prisma.$queryRaw<{ period: Date; new_customers: bigint }[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${truncFn}, "createdAt" AT TIME ZONE 'Asia/Kolkata') AS period,
          COUNT(*) AS new_customers
        FROM "User"
        WHERE "role" = 'CUSTOMER'
          AND "createdAt" >= ${range.start}
          AND "createdAt" <= ${range.end}
        GROUP BY 1 ORDER BY 1 ASC
      `
    ),
    prisma.user.aggregate({
      where: { role: "CUSTOMER" },
      _count: { id: true },
    }),
    prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(DISTINCT "userId") AS count
        FROM "Order"
        WHERE "userId" IN (
          SELECT "id" FROM "User" WHERE "role" = 'CUSTOMER'
        )
        GROUP BY "userId" HAVING COUNT(*) > 1
      `
    ),
    prisma.$queryRaw<{ id: string; name: string | null; email: string; total: number; orders: bigint }[]>(
      Prisma.sql`
        SELECT u."id", u."name", u."email",
               COALESCE(SUM(o."subtotal"), 0)::float AS total,
               COUNT(o."id") AS orders
        FROM "User" u
        LEFT JOIN "Order" o ON o."userId" = u."id"
          AND o."status" NOT IN ('CANCELLED', 'REFUNDED')
        WHERE u."role" = 'CUSTOMER'
        GROUP BY u."id", u."name", u."email"
        ORDER BY total DESC
        LIMIT 10
      `
    ),
  ])

  const newInPeriod   = growth.reduce((s, r) => s + toNum(r.new_customers), 0)
  const repeatCount   = repeatBuyers[0] ? toNum(repeatBuyers[0].count) : 0
  const total         = totals._count.id
  const repeatRate    = total > 0 ? ((repeatCount / total) * 100).toFixed(1) : "0"

  const chartGrowth = growth.map((r) => ({
    period:   r.period.toISOString(),
    customers: toNum(r.new_customers),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customer Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Customers"   value={total}        icon={Users}      color="text-blue-500"   />
        <KpiCard title="New in Period"     value={newInPeriod}  icon={UserCheck}  color="text-green-500"  />
        <KpiCard title="Repeat Buyers"     value={repeatCount}  icon={ShoppingBag} color="text-purple-500" />
        <KpiCard title="Repeat Rate"       value={repeatRate}   icon={TrendingUp} color="text-brand-400"  suffix="%" />
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <p className="text-sm font-semibold mb-4">New Customer Growth</p>
        <AreaChartWidget
          data={chartGrowth}
          series={[{ key: "customers", label: "New Customers", color: "#3b82f6" }]}
          bucket={range.bucket}
        />
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50">
          <p className="text-sm font-semibold">Top 10 Customers by Spend</p>
        </div>
        <div className="divide-y divide-border/50">
          {topCustomers.map((c, i) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <Link href={`/admin/customers/${c.id}`} className="text-sm font-medium hover:underline text-brand-400">
                  {c.name ?? "—"}
                </Link>
                <p className="text-xs text-muted-foreground">{c.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">₹{Number(c.total).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">{toNum(c.orders)} orders</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
