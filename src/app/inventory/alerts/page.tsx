import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, TrendingDown, PackagePlus } from "lucide-react"

export default async function LowStockAlertsPage() {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { stock: "asc" },
  })

  const outOfStock = variants.filter((v) => v.stock === 0)
  const lowStock = variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Low Stock Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Variants that need restocking attention.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-muted-foreground">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">{outOfStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-muted-foreground">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{lowStock.length}</p>
          </CardContent>
        </Card>
      </div>

      {outOfStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Out of Stock ({outOfStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {outOfStock.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{v.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.weight} · {v.sku} · {v.product.category.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant="destructive">0 units</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/inventory/stock">
                        <PackagePlus className="h-3 w-3 mr-1" />
                        Restock
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Low Stock ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {lowStock.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{v.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.weight} · {v.sku} · {v.product.category.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <Badge variant="warning">{v.stock} units</Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        threshold: {v.lowStockThreshold}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/inventory/stock">
                        <PackagePlus className="h-3 w-3 mr-1" />
                        Restock
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {outOfStock.length === 0 && lowStock.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">All variants are well stocked.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
