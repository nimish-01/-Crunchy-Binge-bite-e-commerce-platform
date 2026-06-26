import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import KpiCard from "@/components/admin/analytics/kpi-card"
import Link from "next/link"
import { AlertTriangle, Package, TrendingDown, CheckCircle } from "lucide-react"

export const metadata = { title: "Inventory Analytics — Admin" }

export default async function InventoryAnalyticsPage() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const [lowStock, outOfStock, totalVariants, inventoryValue, recentMovements] = await Promise.all([
    prisma.productVariant.findMany({
      where: { stock: { gt: 0, lte: 10 }, isActive: true },
      orderBy: { stock: "asc" },
      take: 20,
      include: { product: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.productVariant.findMany({
      where: { stock: 0, isActive: true },
      take: 20,
      include: { product: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.productVariant.count({ where: { isActive: true } }),
    prisma.productVariant.aggregate({
      where: { isActive: true },
      _sum: { stock: true, price: true },
    }),
    prisma.inventoryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { variant: { include: { product: { select: { name: true } } } } },
    }),
  ])

  const stockValue = inventoryValue._sum.price ?? 0
  const totalStock = inventoryValue._sum.stock  ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory Analytics</h1>
          <p className="text-sm text-muted-foreground">Live stock levels</p>
        </div>
        <Link href="/admin/inventory" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">
          Manage Inventory →
        </Link>
      </div>

      <AnalyticsNav />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active Variants"    value={totalVariants}   icon={Package}      color="text-blue-500"   />
        <KpiCard title="Total Stock Units"  value={totalStock}      icon={CheckCircle}  color="text-green-500"  />
        <KpiCard title="Low Stock Variants" value={lowStock.length}  icon={AlertTriangle} color="text-yellow-500" />
        <KpiCard title="Out of Stock"       value={outOfStock.length} icon={TrendingDown} color="text-red-500"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <p className="text-sm font-semibold">Low Stock (≤10 units)</p>
          </div>
          <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
            {lowStock.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">All stock levels OK</p>
            )}
            {lowStock.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/admin/products/${v.product.id}/edit`} className="text-sm font-medium hover:underline line-clamp-1">
                    {v.product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{v.weight}</p>
                </div>
                <span className="text-sm font-bold text-yellow-500">{v.stock} left</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <p className="text-sm font-semibold">Out of Stock</p>
          </div>
          <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
            {outOfStock.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No out-of-stock variants</p>
            )}
            {outOfStock.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/admin/products/${v.product.id}/edit`} className="text-sm font-medium hover:underline line-clamp-1">
                    {v.product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{v.weight}</p>
                </div>
                <span className="text-sm font-bold text-red-500">OUT</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
          <Package className="h-4 w-4 text-blue-400" />
          <p className="text-sm font-semibold">Recent Inventory Changes</p>
        </div>
        <div className="divide-y divide-border/50">
          {recentMovements.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No recent movements</p>
          )}
          {recentMovements.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.variant.product.name}</p>
                <p className="text-xs text-muted-foreground">{m.variant.weight} · {m.reason ?? m.updateType}</p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${m.quantityChange > 0 ? "text-green-500" : "text-red-500"}`}>
                  {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                </span>
                <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
