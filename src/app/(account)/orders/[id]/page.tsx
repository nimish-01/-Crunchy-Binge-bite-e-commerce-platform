import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils"
import { ArrowLeft, MapPin, Package, CreditCard, Hash, RotateCcw, Truck, ExternalLink } from "lucide-react"
import { CancelOrderButton } from "./cancel-order-button"
import { ReturnRequestButton } from "./return-request-button"
import { ShipmentTimeline } from "@/components/shipping/shipment-timeline"

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "brand"> = {
  PENDING: "warning", CONFIRMED: "brand", PACKING: "brand", PACKED: "brand",
  READY_TO_SHIP: "brand", SHIPPED: "brand", DISPATCHED: "brand",
  OUT_FOR_DELIVERY: "brand", DELIVERED: "success",
  DELIVERY_FAILED: "destructive", CANCELLED: "destructive", REFUNDED: "secondary",
  RETURN_REQUESTED: "warning", RETURN_APPROVED: "brand", RETURN_PICKED: "brand",
  RETURN_RECEIVED: "brand", REFUND_COMPLETED: "success",
}

interface Props { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/orders")

  const { id } = await params

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true, slug: true, returnWindowDays: true } },
          variant: { select: { weight: true, sku: true } },
        },
      },
      coupon: { select: { code: true, type: true, value: true } },
      returnRequest: { select: { id: true, status: true, requestedAt: true, adminNotes: true } },
      shipment: {
        include: {
          courier: { select: { name: true } },
          events: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  })

  if (!order) notFound()

  const canCancel = order.status === "PENDING" || order.status === "CONFIRMED"

  let returnDaysLeft = 0
  const maxReturnWindow = Math.max(...order.items.map((i) => i.product.returnWindowDays))
  if (order.status === "DELIVERED" && order.deliveredAt && maxReturnWindow > 0 && !order.returnRequest) {
    const deadline = new Date(order.deliveredAt.getTime() + maxReturnWindow * 24 * 60 * 60 * 1000)
    returnDaysLeft = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  }
  const canReturn = returnDaysLeft > 0

  const isDelivered = order.status === "DELIVERED"

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders"><ArrowLeft className="h-4 w-4 mr-1" />Orders</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
            <Badge variant={STATUS_COLORS[order.status] ?? "default"}>{order.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Placed on {formatDateTime(order.createdAt)}</p>
          {isDelivered && order.deliveredAt && (
            <p className="text-sm text-green-500 mt-0.5">
              Delivered on {formatDate(order.deliveredAt)}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCancel && <CancelOrderButton orderId={order.id} />}
          {canReturn && <ReturnRequestButton orderId={order.id} daysLeft={returnDaysLeft} />}
        </div>
      </div>

      {/* Shipment Tracking */}
      {order.shipment && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Shipment Tracking</span>
            </div>
            <div className="flex items-center gap-3">
              {order.shipment.courier && (
                <span className="text-xs text-muted-foreground">{order.shipment.courier.name}</span>
              )}
              {order.shipment.trackingNumber && (
                <span className="font-mono text-xs text-brand-400">{order.shipment.trackingNumber}</span>
              )}
              {order.shipment.trackingUrl && (
                <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-brand-400 transition-colors flex items-center gap-1">
                  Track <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          {order.shipment.estimatedDelivery && (
            <div className="px-4 py-2 border-b border-border/40 bg-brand-500/4">
              <p className="text-xs text-muted-foreground">
                Estimated delivery: <span className="font-medium text-foreground">{formatDate(order.shipment.estimatedDelivery)}</span>
              </p>
            </div>
          )}
          <div className="px-4 py-4">
            <ShipmentTimeline events={order.shipment.events} />
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Order Items</span>
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
                  <Link href={`/products/${item.product.slug}`} className="font-medium text-sm leading-snug hover:underline">
                    {item.product.name}
                  </Link>
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
        {/* Delivery Address */}
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
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
            <p className="text-sm text-muted-foreground">Address not available</p>
          )}
        </div>

        {/* Payment Summary */}
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
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
          <div className="pt-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Method</span>
              <span className="capitalize">{order.paymentMethod?.toLowerCase() ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Status</span>
              <Badge
                variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "destructive" : "secondary"}
                className="text-xs h-5"
              >
                {order.paymentStatus}
              </Badge>
            </div>
            {order.transactionId && (
              <div className="flex justify-between">
                <span>Transaction ID</span>
                <span className="font-mono text-xs">{order.transactionId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return Request Status */}
      {order.returnRequest && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Return Request</span>
            <Badge
              variant={
                order.returnRequest.status === "APPROVED" ? "success"
                : order.returnRequest.status === "REJECTED" ? "destructive"
                : order.returnRequest.status === "COMPLETED" ? "secondary"
                : "warning"
              }
              className="text-xs h-5"
            >
              {order.returnRequest.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted on {formatDate(order.returnRequest.requestedAt)}
          </p>
          {order.returnRequest.adminNotes && (
            <p className="text-sm mt-2 text-foreground bg-muted/40 rounded-md px-3 py-2">
              {order.returnRequest.adminNotes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
