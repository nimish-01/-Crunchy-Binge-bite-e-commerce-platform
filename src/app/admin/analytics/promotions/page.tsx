import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getDateRange, type AnalyticsPeriod } from "@/lib/services/analytics"
import { Suspense } from "react"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import DateFilter from "@/components/admin/analytics/date-filter"
import KpiCard from "@/components/admin/analytics/kpi-card"
import Link from "next/link"
import { Megaphone, CheckCircle, XCircle, Calendar } from "lucide-react"

export const metadata = { title: "Promotions Analytics — Admin" }

interface Props {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>
}

export default async function PromotionsAnalyticsPage({ searchParams }: Props) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const { period = "30d" } = await searchParams
  const range = getDateRange(period as AnalyticsPeriod)

  const [active, expired, upcoming, recent] = await Promise.all([
    prisma.promotion.count({ where: { isActive: true, startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] } }),
    prisma.promotion.count({ where: { endsAt: { lt: new Date() } } }),
    prisma.promotion.count({ where: { startsAt: { gt: new Date() } } }),
    prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, name: true, type: true, isActive: true, startsAt: true, endsAt: true, createdAt: true },
    }),
  ])

  const statusColor: Record<string, string> = {
    FESTIVAL:  "bg-orange-500/15 text-orange-500",
    SEASONAL:  "bg-blue-500/15 text-blue-500",
    CLEARANCE: "bg-red-500/15 text-red-500",
    BUNDLE:    "bg-purple-500/15 text-purple-500",
    FLASH:     "bg-yellow-500/15 text-yellow-500",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Promotions Analytics</h1>
          <p className="text-sm text-muted-foreground">{range.label}</p>
        </div>
        <Link href="/admin/promotions" className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">
          Manage Promotions →
        </Link>
      </div>

      <AnalyticsNav />
      <Suspense><DateFilter current={period} /></Suspense>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Active Promotions"   value={active}   icon={CheckCircle} color="text-green-500"  />
        <KpiCard title="Expired Promotions"  value={expired}  icon={XCircle}     color="text-red-500"    />
        <KpiCard title="Upcoming Promotions" value={upcoming} icon={Calendar}    color="text-blue-500"   />
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-brand-400" />
          <p className="text-sm font-semibold">All Promotions</p>
        </div>
        <div className="divide-y divide-border/50">
          {recent.map((p) => {
            const now    = new Date()
            const isLive = p.isActive && (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt >= now)
            return (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/promotions/${p.id}`} className="text-sm font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {p.startsAt ? p.startsAt.toLocaleDateString("en-IN") : "—"}
                    {p.endsAt ? ` – ${p.endsAt.toLocaleDateString("en-IN")}` : " (no end)"}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.type] ?? "bg-muted text-muted-foreground"}`}>
                  {p.type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLive ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"}`}>
                  {isLive ? "Live" : "Off"}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
