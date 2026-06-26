import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils"
import { ArrowLeft, Printer, Package, MapPin, User, Truck, ExternalLink } from "lucide-react"
import { ShipmentTimeline } from "@/components/shipping/shipment-timeline"
import { ShipmentActions } from "./shipment-actions"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  CREATED:          { label: "Created",          className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
  PACKING:          { label: "Packing",          className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  READY_TO_SHIP:    { label: "Ready to Ship",    className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  SHIPPED:          { label: "Shipped",          className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" },
  IN_TRANSIT:       { label: "In Transit",       className: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "bg-orange-500/10 text-orange-400 border-orange-500/25" },
  DELIVERED:        { label: "Delivered",        className: "bg-green-500/10 text-green-400 border-green-500/25" },
  DELIVERY_FAILED:  { label: "Delivery Failed",  className: "bg-red-500/10 text-red-400 border-red-500/25" },
  RETURN_INITIATED: { label: "Return Initiated", className: "bg-orange-500/10 text-orange-400 border-orange-500/25" },
  RETURN_PICKED:    { label: "Return Picked",    className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  RETURNED:         { label: "Returned",         className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
  CANCELLED:        { label: "Cancelled",        className: "bg-red-500/10 text-red-400 border-red-500/25" },
}

interface Props { params: Promise<{ id: string }> }

export default async function ShipmentDetailPage({ params }: Props) {
  const { id } = await params

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      courier: true,
      events: { orderBy: { createdAt: "asc" } },
      order: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          address: true,
          items: {
            include: {
              product: { select: { name: true, images: true, slug: true } },
              variant: { select: { weight: true, sku: true } },
            },
          },
        },
      },
    },
  })

  if (!shipment) notFound()

  const cfg = STATUS_CONFIG[shipment.status] ?? { label: shipment.status, className: "bg-muted text-muted-foreground border-border" }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/shipping/shipments"><ArrowLeft className="h-4 w-4 mr-1" />Shipments</Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/shipping/shipments/${id}/packing-slip`} target="_blank">
              <Printer className="h-4 w-4 mr-1.5" />Packing Slip
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/shipping/shipments/${id}/label`} target="_blank">
              <Printer className="h-4 w-4 mr-1.5" />Shipping Label
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-lg">{shipment.shipmentNumber}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.className}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Created {formatDateTime(shipment.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Timeline + Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Actions */}
          <ShipmentActions shipment={{
            id: shipment.id,
            status: shipment.status,
            trackingNumber: shipment.trackingNumber,
            courierId: shipment.courierId,
          }} />

          {/* Timeline */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h2 className="font-semibold mb-5">Tracking Timeline</h2>
            <ShipmentTimeline events={shipment.events} />
          </div>

          {/* Order items */}
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Order Items</span>
            </div>
            <div className="divide-y divide-border/40">
              {shipment.order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  {item.product.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.images[0]} alt={item.product.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant.weight} · SKU: {item.variant.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatPrice(item.totalPrice)}</p>
                    <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: details */}
        <div className="space-y-4">
          {/* Package info */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Package</h3>
            <div className="space-y-2 text-sm">
              <Row label="Type"    value={shipment.packageType} />
              <Row label="Weight"  value={shipment.weightGrams ? `${shipment.weightGrams}g` : "—"} />
              <Row label="Dims"    value={shipment.lengthCm ? `${shipment.lengthCm}×${shipment.widthCm}×${shipment.heightCm} cm` : "—"} />
              <Row label="Cost"    value={formatPrice(shipment.shippingCost)} />
              {shipment.codCharges > 0 && <Row label="COD"  value={formatPrice(shipment.codCharges)} />}
              {shipment.insurance > 0  && <Row label="Insur." value={formatPrice(shipment.insurance)} />}
            </div>
          </div>

          {/* Courier / Tracking */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />Courier
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="Courier"    value={shipment.courier?.name ?? "Unassigned"} />
              <Row label="Tracking"   value={shipment.trackingNumber ?? "—"} />
              {shipment.dispatchedAt  && <Row label="Dispatched"   value={formatDate(shipment.dispatchedAt)} />}
              {shipment.estimatedDelivery && <Row label="Est. Delivery" value={formatDate(shipment.estimatedDelivery)} />}
              {shipment.deliveredAt   && <Row label="Delivered"    value={formatDate(shipment.deliveredAt)} />}
            </div>
            {shipment.trackingUrl && (
              <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:underline mt-2">
                Track Shipment <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Customer */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />Customer
            </h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{shipment.order.user.name ?? "—"}</p>
              <p className="text-muted-foreground text-xs">{shipment.order.user.email}</p>
              {shipment.order.user.phone && <p className="text-muted-foreground text-xs">{shipment.order.user.phone}</p>}
            </div>
          </div>

          {/* Delivery Address */}
          {shipment.order.address && (
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />Delivery Address
              </h3>
              <div className="text-sm space-y-0.5">
                <p className="font-medium">{shipment.order.address.name}</p>
                <p className="text-muted-foreground text-xs">{shipment.order.address.phone}</p>
                <p className="text-muted-foreground text-xs">
                  {shipment.order.address.line1}{shipment.order.address.line2 ? `, ${shipment.order.address.line2}` : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  {shipment.order.address.city}, {shipment.order.address.state} – {shipment.order.address.pincode}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {shipment.notes && (
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="font-semibold text-sm mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground">{shipment.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  )
}
