import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export default async function AdminInventoryPage() {
  const variants = await prisma.productVariant.findMany({
    include: { product: { select: { name: true, slug: true } } },
    orderBy: [{ stock: "asc" }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Overview</h1>
        <Button variant="outline" asChild><Link href="/inventory"><ExternalLink className="h-4 w-4" />Inventory Manager View</Link></Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{variants.filter((v) => v.stock === 0).length}</p>
          <p className="text-sm text-muted-foreground">Out of Stock</p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).length}</p>
          <p className="text-sm text-muted-foreground">Low Stock</p>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{variants.filter((v) => v.stock > v.lowStockThreshold).length}</p>
          <p className="text-sm text-muted-foreground">Healthy Stock</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Alert Level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((v) => {
              const isOut = v.stock === 0
              const isLow = !isOut && v.stock <= v.lowStockThreshold
              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium text-sm">{v.product.name}</TableCell>
                  <TableCell className="text-sm">{v.weight}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{v.sku}</TableCell>
                  <TableCell>
                    <span className={`font-bold ${isOut ? "text-red-400" : isLow ? "text-yellow-400" : "text-green-400"}`}>
                      {v.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.lowStockThreshold}</TableCell>
                  <TableCell>
                    <Badge variant={isOut ? "destructive" : isLow ? "warning" : "success"} className="text-xs">
                      {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
