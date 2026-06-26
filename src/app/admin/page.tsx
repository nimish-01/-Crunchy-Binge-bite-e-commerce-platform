import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { formatPrice, formatDate } from "@/lib/utils"
import {
  ShoppingBag, Users, Package, TrendingUp, AlertTriangle,
  ArrowRight, ArrowUpRight, Clock,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

async function getStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const monthAgo = new Date(Date.now() - 30 * 86400000)

  const [todayOrders, weekOrders, totalOrders] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: today } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { createdAt: { gte: weekAgo } }, _sum: { total: true } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: true }),
  ])

  const [pendingOrders, totalCustomers, newCustomers] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthAgo } } }),
  ])

  const [totalProducts, allActiveVariants, recentOrders] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { stock: true, lowStockThreshold: true },
    }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ])

  const lowStockVariants = allActiveVariants.filter((v) => v.stock <= v.lowStockThreshold).length

  return {
    todayOrders, weekOrders, totalOrders, pendingOrders,
    totalCustomers, newCustomers, totalProducts, lowStockVariants, recentOrders,
  }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Pending",    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  CONFIRMED:  { label: "Confirmed",  className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  PACKED:     { label: "Packed",     className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" },
  DISPATCHED: { label: "Dispatched", className: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
  DELIVERED:  { label: "Delivered",  className: "bg-green-500/10 text-green-400 border-green-500/25" },
  CANCELLED:  { label: "Cancelled",  className: "bg-red-500/10 text-red-400 border-red-500/25" },
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const KPIs = [
    {
      label: "Today's Revenue",
      value: formatPrice(stats.todayOrders._sum.total ?? 0),
      sub: `${stats.todayOrders._count} orders today`,
      icon: TrendingUp,
      color: "text-brand-400",
      bg: "bg-brand-500/8",
      href: "/admin/orders",
    },
    {
      label: "This Week",
      value: formatPrice(stats.weekOrders._sum.total ?? 0),
      sub: "Last 7 days revenue",
      icon: ArrowUpRight,
      color: "text-green-400",
      bg: "bg-green-500/8",
      href: "/admin/analytics",
    },
    {
      label: "Customers",
      value: stats.totalCustomers.toLocaleString(),
      sub: `+${stats.newCustomers} this month`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/8",
      href: "/admin/customers",
    },
    {
      label: "Active Products",
      value: stats.totalProducts.toString(),
      sub: `${stats.lowStockVariants} low stock`,
      icon: Package,
      color: "text-purple-400",
      bg: "bg-purple-500/8",
      href: "/admin/products",
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIs.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group rounded-xl border border-border/50 bg-card p-5 hover:border-border transition-all duration-200 hover:shadow-elevation-1"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${kpi.color} tabular-nums`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{kpi.sub}</p>
            </Link>
          )
        })}
      </div>

      {/* Alert banners */}
      {(stats.pendingOrders > 0 || stats.lowStockVariants > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.pendingOrders > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-yellow-500/25 bg-yellow-500/6 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{stats.pendingOrders} pending orders</p>
                  <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href="/admin/orders?status=PENDING">Review</Link>
              </Button>
            </div>
          )}
          {stats.lowStockVariants > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/6 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{stats.lowStockVariants} low stock variants</p>
                  <p className="text-xs text-muted-foreground">Need restocking soon</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href="/admin/inventory">Restock</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Recent Orders */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h2 className="font-semibold">Recent Orders</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest customer orders</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/orders" className="gap-1.5">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recent orders">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {stats.recentOrders.map((order) => {
                const status = STATUS_CONFIG[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground border-border" }
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-semibold hover:text-brand-400 transition-colors"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-muted-foreground text-xs truncate max-w-[140px] block">
                        {order.user?.name ?? order.user?.email ?? "Guest"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-semibold text-brand-400">{formatPrice(order.total)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
