import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice, formatDate } from "@/lib/utils"
import { ShoppingBag, Users, Package, TrendingUp, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

async function getStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const monthAgo = new Date(Date.now() - 30 * 86400000)

  const [
    todayOrders, weekOrders, totalOrders,
    pendingOrders, totalCustomers, newCustomers,
    totalProducts, allActiveVariants, recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: today } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { createdAt: { gte: weekAgo } }, _sum: { total: true } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: true }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthAgo } } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    // Fetch stock + threshold per variant so we can compare them (Prisma doesn't support column-to-column WHERE)
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { stock: true, lowStockThreshold: true },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ])

  const lowStockVariants = allActiveVariants.filter((v) => v.stock <= v.lowStockThreshold).length

  return { todayOrders, weekOrders, totalOrders, pendingOrders, totalCustomers, newCustomers, totalProducts, lowStockVariants, recentOrders: recentOrders }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "warning", CONFIRMED: "brand", PACKED: "brand",
  DISPATCHED: "brand", DELIVERED: "success", CANCELLED: "destructive",
}

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, Admin</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: formatPrice(stats.todayOrders._sum.total ?? 0), sub: `${stats.todayOrders._count} orders`, icon: TrendingUp, color: "text-brand-400" },
          { label: "This Week", value: formatPrice(stats.weekOrders._sum.total ?? 0), sub: "Revenue", icon: TrendingUp, color: "text-green-400" },
          { label: "Total Customers", value: stats.totalCustomers.toLocaleString(), sub: `+${stats.newCustomers} this month`, icon: Users, color: "text-blue-400" },
          { label: "Active Products", value: stats.totalProducts.toString(), sub: `${stats.lowStockVariants} low stock`, icon: Package, color: "text-purple-400" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.pendingOrders > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="font-medium text-sm">{stats.pendingOrders} Pending Orders</p>
                    <p className="text-xs text-muted-foreground">Need attention</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild><Link href="/admin/orders?status=PENDING">View</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
        {stats.lowStockVariants > 0 && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="font-medium text-sm">{stats.lowStockVariants} Low Stock Variants</p>
                    <p className="text-xs text-muted-foreground">Need restocking</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild><Link href="/admin/inventory">View</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Button variant="ghost" size="sm" asChild><Link href="/admin/orders">View All</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">#{order.orderNumber}</span>
                    <Badge variant={(STATUS_COLORS[order.status] as "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "brand") ?? "default"} className="text-xs">
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.user?.name ?? order.user?.email} · {formatDate(order.createdAt)}</p>
                </div>
                <p className="font-semibold text-brand-400">{formatPrice(order.total)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
