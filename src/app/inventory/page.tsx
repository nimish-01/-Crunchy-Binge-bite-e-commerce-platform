import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, AlertTriangle, TrendingDown, Activity, History } from "lucide-react"

function formatUpdateType(type: string) {
  const map: Record<string, string> = {
    ADD: "Received",
    REMOVE: "Sold",
    SET: "Adjusted",
    DAMAGED: "Damaged",
    EXPIRED: "Expired",
  }
  return map[type] ?? type
}

export default async function InventoryDashboard() {
  const [allVariants, recentLogs] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { stock: true, lowStockThreshold: true },
    }),
    prisma.inventoryLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        variant: { include: { product: { select: { name: true } } } },
        updatedByUser: { select: { name: true } },
      },
    }),
  ])

  const totalVariants = allVariants.length
  const outOfStockCount = allVariants.filter((v) => v.stock === 0).length
  const lowStockCount = allVariants.filter(
    (v) => v.stock > 0 && v.stock <= v.lowStockThreshold
  ).length
  const healthyCount = totalVariants - lowStockCount - outOfStockCount

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total SKUs", value: totalVariants, icon: Package, color: "text-blue-400" },
          { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Out of Stock", value: outOfStockCount, icon: TrendingDown, color: "text-red-400" },
          { label: "Healthy", value: healthyCount, icon: Activity, color: "text-green-400" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="brand" asChild>
          <Link href="/inventory/stock">Update Stock</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/inventory/alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Low Stock Alerts {lowStockCount > 0 && `(${lowStockCount})`}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/inventory/history">
            <History className="h-4 w-4 mr-2" />
            View History
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Stock Activity</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inventory/history">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No stock updates yet.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {log.variant.product.name} ({log.variant.weight})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.updatedByUser?.name} · {new Date(log.createdAt).toLocaleDateString("en-IN")}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground/70 truncate max-w-[220px]">{log.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        log.updateType === "ADD"
                          ? "success"
                          : log.updateType === "DAMAGED"
                          ? "destructive"
                          : log.updateType === "REMOVE"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {formatUpdateType(log.updateType)}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {log.previousQuantity} → {log.newQuantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
