import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice, formatDateTime } from "@/lib/utils"
import { ArrowLeft, MapPin, Package, CreditCard, User, Hash } from "lucide-react"
import { OrderStatusUpdater } from "./order-status-updater"
import { MarkAsPaidButton } from "./mark-paid-button"

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "brand"> = {
  PENDING: "warning", CONFIRMED: "brand", PACKED: "brand",
  DISPATCHED: "brand", DELIVERED: "success", CANCELLED: "destructive", REFUNDED: "secondary",
}

interface Props { params: Promise<{ id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { weight: true, sku: true } },
        },
      },
      coupon: { select: { code: true, type: true, value: true } },
    },
  })

  if (!order) notFound()

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders"><ArrowLeft className="h-4 w-4 mr-1" />Orders</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono font-bold text-xl">{order.orderNumber}</span>
            <Badge variant={STATUS_COLORS[order.status] ?? "default"}>{order.status}</Badge>
            <Badge variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "destructive" : "secondary"}>
              {order.paymentStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {order.paymentMethod === "COD" && order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED" && (
            <MarkAsPaidButton orderId={order.id} />
          )}
          <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      {/* Customer */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Customer</span>
        </div>
        <div className="text-sm space-y-0.5">
          <p className="font-medium">{order.user?.name ?? "—"}</p>
          <p className="text-muted-foreground">{order.user?.email}</p>
          {order.user?.phone && <p className="text-muted-foreground">{order.user.phone}</p>}
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Order Items ({order.items.length})</span>
        </div>
        <div className="divide-y divide-border/40">
          {order.items.map((item) => {
            const img = item.product.images?.[0]
            return (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.variant.weight} · Qty {item.quantity}
                    {item.variant.sku ? ` · SKU: ${item.variant.sku}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{formatPrice(item.totalPrice)}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(item.unitPrice)} each</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Delivery Address</span>
          </div>
          {order.address ? (
            <div className="text-sm space-y-0.5">
              <p className="font-medium">{order.address.name}</p>
              <p className="text-muted-foreground">{order.address.phone}</p>
              <p>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}</p>
              <p>{order.address.city}, {order.address.state} – {order.address.pincode}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not available</p>
          )}
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Payment Summary</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                <span>−{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>{order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : "FREE"}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-brand-400">{formatPrice(order.total)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Method</span>
              <span className="capitalize">{order.paymentMethod?.toLowerCase() ?? "—"}</span>
            </div>
            {order.transactionId && (
              <div className="flex justify-between">
                <span>Payment ID</span>
                <span className="font-mono">{order.transactionId}</span>
              </div>
            )}
            {order.razorpayOrderId && (
              <div className="flex justify-between">
                <span>Razorpay Order</span>
                <span className="font-mono">{order.razorpayOrderId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
