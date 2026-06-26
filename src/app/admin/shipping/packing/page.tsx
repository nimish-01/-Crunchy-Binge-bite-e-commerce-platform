import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDate, formatPrice } from "@/lib/utils"
import { BoxIcon, ArrowRight, Clock } from "lucide-react"
import { PackingActions } from "./packing-actions"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  CONFIRMED:  { label: "Confirmed",  className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  PACKING:    { label: "Packing",    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  PACKED:     { label: "Packed",     className: "bg-green-500/10 text-green-400 border-green-500/25" },
}

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function PackingQueuePage({ searchParams }: Props) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10))
  const PAGE_SIZE = 25

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "PACKING", "PACKED"] },
        paymentStatus: "PAID",
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        address: { select: { name: true, city: true, state: true, pincode: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
            variant: { select: { weight: true, sku: true } },
          },
        },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: ["CONFIRMED", "PACKING", "PACKED"] },
        paymentStatus: "PAID",
      },
    }),
  ])

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Packing Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} orders awaiting packing — oldest first
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card py-20 text-center">
          <BoxIcon className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-medium text-muted-foreground">No orders to pack</p>
          <p className="text-xs text-muted-foreground/60 mt-1">All confirmed orders have been packed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground border-border" }
            const ageHours = Math.round((Date.now() - order.createdAt.getTime()) / 3600000)
            const isUrgent = ageHours >= 24

            return (
              <div key={order.id} className={`rounded-xl border bg-card overflow-hidden ${isUrgent ? "border-orange-500/30" : "border-border/50"}`}>
                {/* Order header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold">#{order.orderNumber}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.className}`}>
                      {cfg.label}
                    </span>
                    {isUrgent && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-400 font-medium">
                        <Clock className="h-3 w-3" />{ageHours}h old
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-brand-400">{formatPrice(order.total)}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-5 py-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.product.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.variant.weight} · SKU: {item.variant.sku}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Footer: customer + actions */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20">
                  <div className="text-xs text-muted-foreground">
                    {order.user.name ?? order.user.email} · {order.address?.city}{order.address?.state ? `, ${order.address.state}` : ""} {order.address?.pincode}
                  </div>
                  <div className="flex items-center gap-2">
                    <PackingActions orderId={order.id} currentStatus={order.status} />
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/orders/${order.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">Page {page} of {pages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/shipping/packing?page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            {page < pages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/shipping/packing?page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
