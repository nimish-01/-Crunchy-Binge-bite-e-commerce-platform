import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { formatPrice, formatDate } from "@/lib/utils"
import Link from "next/link"
import { Package, ChevronRight, ShoppingBag } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Pending",    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/25" },
  CONFIRMED:  { label: "Confirmed",  className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  PACKED:     { label: "Packed",     className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" },
  DISPATCHED: { label: "Dispatched", className: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
  DELIVERED:  { label: "Delivered",  className: "bg-green-500/10 text-green-500 border-green-500/25" },
  CANCELLED:  { label: "Cancelled",  className: "bg-red-500/10 text-red-400 border-red-500/25" },
  REFUNDED:   { label: "Refunded",   className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
}

export default async function OrdersPage() {
  const session = await auth()
  const orders = await prisma.order.findMany({
    where: { userId: session!.user.id },
    include: {
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { weight: true } },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No orders yet</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Your order history will appear here once you make your first purchase.
        </p>
        <Button variant="brand" asChild>
          <Link href="/products">Start Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <span className="text-sm text-muted-foreground">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const firstItem = order.items[0]
          const status = STATUS_CONFIG[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground border-border" }

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="group block rounded-xl border border-border/50 bg-card p-4 hover:border-border transition-all duration-200 hover:shadow-elevation-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Icon */}
                  <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold">#{order.orderNumber}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.createdAt)}</p>
                    {firstItem && (
                      <p className="text-sm text-muted-foreground mt-1.5 truncate">
                        {firstItem.product.name}
                        {firstItem.variant.weight && ` · ${firstItem.variant.weight}`}
                        {order.items.length > 1 && ` + ${order.items.length - 1} more item${order.items.length > 2 ? "s" : ""}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-brand-400">{formatPrice(order.total)}</p>
                    {order.paymentMethod && (
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {order.paymentMethod.toLowerCase()}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
