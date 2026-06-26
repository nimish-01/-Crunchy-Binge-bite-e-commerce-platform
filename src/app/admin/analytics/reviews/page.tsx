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
import { Star, CheckCircle, XCircle, Clock } from "lucide-react"

export const metadata = { title: "Reviews Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function ReviewsAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d", startDate, endDate } = await searchParams
  const range = getDateRange(period as AnalyticsPeriod, startDate, endDate)

  const [stats, ratingDist, mostReviewed, mostHelpful] = await Promise.all([
    prisma.review.groupBy({
      by: ["status"],
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { id: true },
      _avg: { rating: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { status: "APPROVED" },
      _count: { id: true },
      orderBy: { rating: "desc" },
    }),
    prisma.product.findMany({
      orderBy: { reviews: { _count: "desc" } },
      take: 8,
      select: {
        id: true, name: true, slug: true,
        _count: { select: { reviews: { where: { status: "APPROVED" } } } },
      },
    }),
    prisma.review.findMany({
      where: { status: "APPROVED", helpfulCount: { gt: 0 } },
      orderBy: { helpfulCount: "desc" },
      take: 5,
      include: {
        product: { select: { name: true } },
        user:    { select: { name: true } },
      },
    }),
  ])

  const approved = stats.find((s) => s.status === "APPROVED")?._count.id ?? 0
  const pending  = stats.find((s) => s.status === "PENDING")?._count.id  ?? 0
  const rejected = stats.find((s) => s.status === "REJECTED")?._count.id ?? 0
  const avgRating = stats.find((s) => s.status === "APPROVED")?._avg.rating ?? 0

  const ratingBarData = [5, 4, 3, 2, 1].map((r) => ({
    name:  `${r} ★`,
    count: ratingDist.find((d) => d.rating === r)?._count.id ?? 0,
  }))

  const mostReviewedData = mostReviewed.map((p) => ({
    name:  p.name.slice(0, 20),
    count: p._count.reviews,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reviews Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
        <Link href="/admin/reviews" className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">
          Moderate Reviews →
        </Link>
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Approved"    value={approved}               icon={CheckCircle} color="text-green-500"  />
        <KpiCard title="Pending"     value={pending}                icon={Clock}       color="text-yellow-500" />
        <KpiCard title="Rejected"    value={rejected}               icon={XCircle}     color="text-red-500"    />
        <KpiCard title="Avg Rating"  value={avgRating.toFixed(2)}   icon={Star}        color="text-yellow-500" suffix=" ★" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-sm font-semibold mb-4">Rating Distribution (All Approved)</p>
          <BarChartWidget
            data={ratingBarData}
            series={[{ key: "count", label: "Reviews", color: "#f59e0b" }]}
            height={200}
          />
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-sm font-semibold mb-4">Most Reviewed Products</p>
          <BarChartWidget
            data={mostReviewedData}
            series={[{ key: "count", label: "Reviews", color: "#3b82f6" }]}
            horizontal
            height={240}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50 flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-400" />
          <p className="text-sm font-semibold">Most Helpful Reviews</p>
        </div>
        <div className="divide-y divide-border/50">
          {mostHelpful.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No helpful votes yet</p>
          )}
          {mostHelpful.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-brand-400">{r.product.name}</p>
                  <p className="text-xs text-muted-foreground">by {r.user.name ?? "Anonymous"}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="text-yellow-500">{"★".repeat(r.rating)}</span>
                  <span>{r.helpfulCount} helpful</span>
                </div>
              </div>
              <p className="text-sm mt-1 line-clamp-2">{r.body ?? ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
