import { prisma } from "@/lib/prisma"
import { formatPrice } from "@/lib/utils"
import { BarChart3, Truck, CheckCircle2, AlertTriangle, RotateCcw, Timer, TrendingUp } from "lucide-react"
import Link from "next/link"

interface Props {
  searchParams: Promise<{ days?: string }>
}

async function getReportData(days: number) {
  const since = new Date(Date.now() - days * 86400000)

  const [shipments, returns, failedDeliveries, courierBreakdown] = await Promise.all([
    prisma.shipment.findMany({
      where: { createdAt: { gte: since } },
      select: { status: true, shippingCost: true, dispatchedAt: true, deliveredAt: true, courierId: true },
    }),
    prisma.returnRequest.count({ where: { requestedAt: { gte: since } } }),
    prisma.order.count({ where: { status: "DELIVERY_FAILED", updatedAt: { gte: since } } }),
    prisma.shipment.groupBy({
      by: ["courierId"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _sum: { shippingCost: true },
    }),
  ])

  const delivered = shipments.filter((s) => s.status === "DELIVERED")
  const withTimes = delivered.filter((s) => s.dispatchedAt && s.deliveredAt)
  const avgDeliveryDays = withTimes.length > 0
    ? withTimes.reduce((acc, s) => acc + (s.deliveredAt!.getTime() - s.dispatchedAt!.getTime()) / 86400000, 0) / withTimes.length
    : 0

  const totalCost = shipments.reduce((a, s) => a + s.shippingCost, 0)

  const courierIds = courierBreakdown.map((c) => c.courierId).filter(Boolean) as string[]
  const couriers = courierIds.length
    ? await prisma.courier.findMany({ where: { id: { in: courierIds } }, select: { id: true, name: true } })
    : []
  const courierMap = Object.fromEntries(couriers.map((c) => [c.id, c.name]))

  return {
    total:        shipments.length,
    delivered:    delivered.length,
    inTransit:    shipments.filter((s) => ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(s.status)).length,
    failed:       shipments.filter((s) => s.status === "DELIVERY_FAILED").length,
    returns,
    failedDeliveries,
    avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
    totalCost,
    returnRate: shipments.length > 0 ? Math.round((returns / shipments.length) * 1000) / 10 : 0,
    deliveryRate: shipments.length > 0 ? Math.round((delivered.length / shipments.length) * 1000) / 10 : 0,
    courierBreakdown: courierBreakdown.map((c) => ({
      courierId: c.courierId,
      name: c.courierId ? (courierMap[c.courierId] ?? "Unknown") : "Unassigned",
      shipments: c._count.id,
      revenue: c._sum.shippingCost ?? 0,
    })),
  }
}

export default async function ShippingReportsPage({ searchParams }: Props) {
  const sp = await searchParams
  const days = Math.min(90, Math.max(7, parseInt(sp.days ?? "30", 10)))
  const data = await getReportData(days)

  const PERIOD_OPTIONS = [7, 14, 30, 60, 90]

  const metrics = [
    { label: "Total Shipments",   value: data.total,                        icon: Truck,         color: "text-brand-400" },
    { label: "Delivered",         value: `${data.delivered} (${data.deliveryRate}%)`, icon: CheckCircle2, color: "text-green-400" },
    { label: "In Transit",        value: data.inTransit,                    icon: Timer,         color: "text-indigo-400" },
    { label: "Failed Deliveries", value: data.failed,                       icon: AlertTriangle, color: "text-red-400" },
    { label: "Returns",           value: `${data.returns} (${data.returnRate}%)`, icon: RotateCcw, color: "text-orange-400" },
    { label: "Avg Delivery",      value: `${data.avgDeliveryDays} days`,    icon: TrendingUp,    color: "text-purple-400" },
    { label: "Shipping Cost",     value: formatPrice(data.totalCost),       icon: BarChart3,     color: "text-yellow-400" },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shipping Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Analytics for the last {days} days</p>
        </div>
        <div className="flex gap-1.5">
          {PERIOD_OPTIONS.map((d) => (
            <Link
              key={d}
              href={`/admin/shipping/reports?days=${d}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === d ? "bg-brand-500/15 text-brand-400 border border-brand-500/25" : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-4 w-4 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className={`text-xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
            </div>
          )
        })}
      </div>

      {/* Courier breakdown */}
      {data.courierBreakdown.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h2 className="font-semibold">Courier Performance</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Last {days} days</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courier</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipments</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.courierBreakdown.sort((a, b) => b.shipments - a.shipments).map((c) => (
                <tr key={c.courierId ?? "unassigned"} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-sm">{c.name}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-sm">{c.shipments}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold text-brand-400">{formatPrice(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
