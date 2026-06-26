import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getDateRange, toNum, type AnalyticsPeriod } from "@/lib/services/analytics"
import { Prisma } from "@prisma/client"
import { Suspense } from "react"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import DateFilter from "@/components/admin/analytics/date-filter"
import KpiCard from "@/components/admin/analytics/kpi-card"
import BarChartWidget from "@/components/admin/analytics/bar-chart-widget"
import PieChartWidget from "@/components/admin/analytics/pie-chart-widget"
import Link from "next/link"
import { Package, Star, Heart, TrendingUp, TrendingDown } from "lucide-react"

export const metadata = { title: "Product Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function ProductsAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d", startDate, endDate } = await searchParams
  const range = getDateRange(period as AnalyticsPeriod, startDate, endDate)

  const [bestSellers, worstSellers, mostWishlisted, mostReviewed, categoryPerf] = await Promise.all([
    prisma.$queryRaw<{ id: string; name: string; slug: string; qty: bigint; revenue: number }[]>(
      Prisma.sql`
        SELECT p."id", p."name", p."slug",
               COALESCE(SUM(oi."quantity"), 0) AS qty,
               COALESCE(SUM(oi."quantity" * oi."price"), 0)::float AS revenue
        FROM "Product" p
        JOIN "OrderItem" oi ON oi."productId" = p."id"
        JOIN "Order" o ON o."id" = oi."orderId"
          AND o."createdAt" >= ${range.start}
          AND o."createdAt" <= ${range.end}
          AND o."status" NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY p."id", p."name", p."slug"
        ORDER BY qty DESC LIMIT 8
      `
    ),
    prisma.$queryRaw<{ id: string; name: string; slug: string; qty: bigint }[]>(
      Prisma.sql`
        SELECT p."id", p."name", p."slug",
               COALESCE(SUM(oi."quantity"), 0) AS qty
        FROM "Product" p
        LEFT JOIN "OrderItem" oi ON oi."productId" = p."id"
        LEFT JOIN "Order" o ON o."id" = oi."orderId"
          AND o."createdAt" >= ${range.start}
          AND o."createdAt" <= ${range.end}
          AND o."status" NOT IN ('CANCELLED', 'REFUNDED')
        WHERE p."status" = 'ACTIVE'
        GROUP BY p."id", p."name", p."slug"
        ORDER BY qty ASC LIMIT 5
      `
    ),
    prisma.$queryRaw<{ id: string; name: string; slug: string; count: bigint }[]>(
      Prisma.sql`
        SELECT p."id", p."name", p."slug", COUNT(w."id") AS count
        FROM "Product" p
        JOIN "Wishlist" w ON w."productId" = p."id"
        GROUP BY p."id", p."name", p."slug"
        ORDER BY count DESC LIMIT 8
      `
    ),
    prisma.$queryRaw<{ id: string; name: string; slug: string; count: bigint; avg_rating: number }[]>(
      Prisma.sql`
        SELECT p."id", p."name", p."slug",
               COUNT(r."id") AS count,
               AVG(r."rating")::float AS avg_rating
        FROM "Product" p
        JOIN "Review" r ON r."productId" = p."id" AND r."status" = 'APPROVED'
        GROUP BY p."id", p."name", p."slug"
        ORDER BY count DESC LIMIT 8
      `
    ),
    prisma.$queryRaw<{ name: string; products: bigint; revenue: number }[]>(
      Prisma.sql`
        SELECT c."name",
               COUNT(DISTINCT p."id") AS products,
               COALESCE(SUM(oi."quantity" * oi."price"), 0)::float AS revenue
        FROM "Category" c
        JOIN "Product" p ON p."categoryId" = c."id"
        LEFT JOIN "OrderItem" oi ON oi."productId" = p."id"
        LEFT JOIN "Order" o ON o."id" = oi."orderId"
          AND o."createdAt" >= ${range.start}
          AND o."createdAt" <= ${range.end}
          AND o."status" NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY c."name"
        ORDER BY revenue DESC
      `
    ),
  ])

  const bestBarData     = bestSellers.map((p) => ({ name: p.name.slice(0, 20), qty: toNum(p.qty), revenue: toNum(p.revenue) }))
  const categoryPieData = categoryPerf.map((c) => ({ name: c.name, value: toNum(c.revenue) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Product Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Products Sold (SKUs)" value={bestSellers.length}       icon={Package}    color="text-brand-400" />
        <KpiCard title="Units Sold"           value={bestSellers.reduce((s, p) => s + toNum(p.qty), 0)} icon={TrendingUp} color="text-green-500" />
        <KpiCard title="Most Wishlisted"      value={mostWishlisted[0]?.name.slice(0, 18) ?? "—"} icon={Heart}    color="text-red-500" />
        <KpiCard title="Highest Rated"        value={mostReviewed[0]?.name.slice(0, 18) ?? "—"} icon={Star}     color="text-yellow-500" />
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <p className="text-sm font-semibold mb-4">Best Selling Products (Units)</p>
        <BarChartWidget
          data={bestBarData}
          series={[{ key: "qty", label: "Units Sold", color: "#f97316" }]}
          horizontal
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartWidget data={categoryPieData} title="Revenue by Category" prefix="₹" donut />

        <div className="rounded-xl border border-border/50 bg-card">
          <div className="p-4 border-b border-border/50 flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            <p className="text-sm font-semibold">Most Wishlisted</p>
          </div>
          <div className="divide-y divide-border/50">
            {mostWishlisted.slice(0, 6).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <Link href={`/admin/products/${p.id}/edit`} className="flex-1 text-sm hover:underline text-brand-400 line-clamp-1">
                  {p.name}
                </Link>
                <span className="text-sm font-medium">{toNum(p.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50 flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-400" />
          <p className="text-sm font-semibold">Most Reviewed Products</p>
        </div>
        <div className="divide-y divide-border/50">
          {mostReviewed.slice(0, 6).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
              <Link href={`/admin/products/${p.id}/edit`} className="flex-1 text-sm hover:underline text-brand-400 line-clamp-1">
                {p.name}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-yellow-500">★ {p.avg_rating?.toFixed(1) ?? "—"}</span>
                <span className="text-sm text-muted-foreground">{toNum(p.count)} reviews</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-400" />
          <p className="text-sm font-semibold">Slow Sellers (Active Products, Fewest Units)</p>
        </div>
        <div className="divide-y divide-border/50">
          {worstSellers.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
              <Link href={`/admin/products/${p.id}/edit`} className="flex-1 text-sm hover:underline line-clamp-1">
                {p.name}
              </Link>
              <span className="text-sm text-muted-foreground">{toNum(p.qty)} units</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
