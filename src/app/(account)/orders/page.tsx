import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice, formatDate } from "@/lib/utils"
import Link from "next/link"
import { Package } from "lucide-react"

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "brand"> = {
  PENDING: "warning",
  CONFIRMED: "brand",
  PACKED: "brand",
  DISPATCHED: "brand",
  DELIVERED: "success",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
}

export default async function OrdersPage() {
  const session = await auth()
  const orders = await prisma.order.findMany({
    where: { userId: session!.user.id },
    include: {
      items: {
        include: { product: { select: { name: true, images: true } }, variant: { select: { weight: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
        <p className="text-muted-foreground mb-6">Your order history will appear here.</p>
        <Button variant="brand" asChild><Link href="/products">Start Shopping</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Orders</h1>
      {orders.map((order) => {
        const firstItem = order.items[0]
        return (
          <div key={order.id} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold">#{order.orderNumber}</span>
                  <Badge variant={STATUS_COLORS[order.status] ?? "default"}>{order.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                {firstItem && (
                  <p className="text-sm mt-2">{firstItem.product.name} ({firstItem.variant.weight}){order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-400">{formatPrice(order.total)}</p>
                <p className="text-xs text-muted-foreground capitalize">{order.paymentMethod?.toLowerCase()}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/orders/${order.id}`}>View Details</Link>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
