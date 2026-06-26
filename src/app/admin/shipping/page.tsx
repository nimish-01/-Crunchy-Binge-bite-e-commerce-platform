import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  Package, Truck, CheckCircle2, AlertTriangle, RotateCcw,
  Clock, TrendingUp, ArrowRight, BoxIcon, Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"

async function getStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 86400000)

  const [
    toPack, readyToShip, shippedToday, deliveredToday,
    deliveryFailed, pendingReturns, inTransit,
    weekShipments,
  ] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "PACKING", "PACKED"] } } }),
    prisma.order.count({ where: { status: "READY_TO_SHIP" } }),
    prisma.shipment.count({ where: { dispatchedAt: { gte: today } } }),
    prisma.order.count({ where: { status: "DELIVERED", deliveredAt: { gte: today } } }),
    prisma.order.count({ where: { status: "DELIVERY_FAILED" } }),
    prisma.returnRequest.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { in: ["SHIPPED", "OUT_FOR_DELIVERY"] } } }),
    prisma.shipment.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { shippingCost: true },
    }),
  ])

  const weekRevenue = weekShipments.reduce((a, s) => a + s.shippingCost, 0)

  return { toPack, readyToShip, shippedToday, deliveredToday, deliveryFailed, pendingReturns, inTransit, weekRevenue }
}

async function getRecentShipments() {
  return prisma.shipment.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      courier: { select: { name: true } },
      order: {
        select: {
          orderNumber: true,
          user: { select: { name: true } },
          address: { select: { city: true, state: true } },
        },
      },
    },
  })
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  CREATED:          { label: "Created",          className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
  PACKING:          { label: "Packing",          className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  READY_TO_SHIP:    { label: "Ready",            className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  SHIPPED:          { label: "Shipped",          className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" },
  IN_TRANSIT:       { label: "In Transit",       className: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "bg-orange-500/10 text-orange-400 border-orange-500/25" },
  DELIVERED:        { label: "Delivered",        className: "bg-green-500/10 text-green-400 border-green-500/25" },
  DELIVERY_FAILED:  { label: "Failed",           className: "bg-red-500/10 text-red-400 border-red-500/25" },
  CANCELLED:        { label: "Cancelled",        className: "bg-red-500/10 text-red-400 border-red-500/25" },
  RETURNED:         { label: "Returned",         className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
}

export default async function ShippingDashboard() {
  const [stats, recentShipments] = await Promise.all([getStats(), getRecentShipments()])

  const KPIs = [
    { label: "To Pack",          value: stats.toPack,         icon: BoxIcon,      color: "text-yellow-400",  bg: "bg-yellow-500/8",  href: "/admin/shipping/packing",   urgent: stats.toPack > 0 },
    { label: "Ready to Ship",    value: stats.readyToShip,    icon: Package,      color: "text-blue-400",    bg: "bg-blue-500/8",    href: "/admin/shipping/shipments?status=READY_TO_SHIP" },
    { label: "Shipped Today",    value: stats.shippedToday,   icon: Truck,        color: "text-brand-400",   bg: "bg-brand-500/8",   href: "/admin/shipping/shipments" },
    { label: "Delivered Today",  value: stats.deliveredToday, icon: CheckCircle2, color: "text-green-400",   bg: "bg-green-500/8",   href: "/admin/shipping/shipments?status=DELIVERED" },
    { label: "In Transit",       value: stats.inTransit,      icon: Timer,        color: "text-indigo-400",  bg: "bg-indigo-500/8",  href: "/admin/shipping/shipments" },
    { label: "Delivery Failed",  value: stats.deliveryFailed, icon: AlertTriangle, color: "text-red-400",   bg: "bg-red-500/8",     href: "/admin/shipping/shipments?status=DELIVERY_FAILED", urgent: stats.deliveryFailed > 0 },
    { label: "Pending Returns",  value: stats.pendingReturns, icon: RotateCcw,    color: "text-orange-400",  bg: "bg-orange-500/8",  href: "/admin/shipping/returns", urgent: stats.pendingReturns > 0 },
    { label: "Shipping Revenue", value: formatPrice(stats.weekRevenue), icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/8", href: "/admin/shipping/reports", isPrice: true },
  ]

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shipping</h1>
          <p className="text-muted-foreground text-sm mt-1">Fulfillment overview and operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/shipping/packing">Packing Queue</Link>
          </Button>
          <Button variant="brand" size="sm" asChild>
            <Link href="/admin/shipping/shipments">All Shipments</Link>
          </Button>
        </div>
      </div>

      {/* Alert row */}
      {(stats.toPack > 0 || stats.deliveryFailed > 0 || stats.pendingReturns > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.toPack > 0 && (
            <Link href="/admin/shipping/packing" className="flex items-center gap-3 rounded-xl border border-yellow-500/25 bg-yellow-500/6 px-4 py-3 hover:bg-yellow-500/10 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{stats.toPack} orders to pack</p>
                <p className="text-xs text-muted-foreground">Go to packing queue</p>
              </div>
            </Link>
          )}
          {stats.deliveryFailed > 0 && (
            <Link href="/admin/shipping/shipments?status=DELIVERY_FAILED" className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/6 px-4 py-3 hover:bg-red-500/10 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{stats.deliveryFailed} failed deliveries</p>
                <p className="text-xs text-muted-foreground">Needs rescheduling</p>
              </div>
            </Link>
          )}
          {stats.pendingReturns > 0 && (
            <Link href="/admin/shipping/returns" className="flex items-center gap-3 rounded-xl border border-orange-500/25 bg-orange-500/6 px-4 py-3 hover:bg-orange-500/10 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                <RotateCcw className="h-4 w-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{stats.pendingReturns} pending returns</p>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIs.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={`group rounded-xl border p-5 transition-all duration-200 hover:shadow-elevation-1 ${kpi.urgent ? "border-border" : "border-border/50"} bg-card`}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </Link>
          )
        })}
      </div>

      {/* Recent Shipments */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h2 className="font-semibold">Recent Shipments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest created shipments</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/shipping/shipments" className="gap-1.5">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {recentShipments.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No shipments yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Shipments will appear here as orders are packed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Recent shipments">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipment</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Courier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Destination</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {recentShipments.map((s) => {
                  const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, className: "bg-muted text-muted-foreground border-border" }
                  return (
                    <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/shipping/shipments/${s.id}`} className="font-mono text-xs font-semibold hover:text-brand-400 transition-colors">
                          {s.shipmentNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <Link href={`/admin/orders/${s.order.orderNumber}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                          #{s.order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{s.courier?.name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{s.order.address?.city ?? "—"}{s.order.address?.state ? `, ${s.order.address.state}` : ""}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Delivery Zones",  href: "/admin/shipping/zones",    desc: "Manage PIN codes & charges" },
          { label: "Couriers",        href: "/admin/shipping/couriers", desc: "Configure courier partners" },
          { label: "Shipping Rates",  href: "/admin/shipping/rates",    desc: "Set pricing rules" },
          { label: "Reports",         href: "/admin/shipping/reports",  desc: "Shipping analytics" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border/50 bg-card p-4 hover:border-border transition-all duration-200 hover:shadow-elevation-1"
          >
            <p className="text-sm font-medium group-hover:text-brand-400 transition-colors">{link.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
