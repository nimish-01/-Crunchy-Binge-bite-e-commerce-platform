import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Truck, ArrowRight, Plus } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  CREATED:          { label: "Created",          className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
  PACKING:          { label: "Packing",          className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  READY_TO_SHIP:    { label: "Ready",            className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  SHIPPED:          { label: "Shipped",          className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" },
  IN_TRANSIT:       { label: "In Transit",       className: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "bg-orange-500/10 text-orange-400 border-orange-500/25" },
  DELIVERED:        { label: "Delivered",        className: "bg-green-500/10 text-green-400 border-green-500/25" },
  DELIVERY_FAILED:  { label: "Failed",           className: "bg-red-500/10 text-red-400 border-red-500/25" },
  CANCELLED:        { label: "Cancelled",        className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
  RETURNED:         { label: "Returned",         className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
}

const STATUS_TABS = [
  { label: "All",           value: "" },
  { label: "Packing",       value: "PACKING" },
  { label: "Ready",         value: "READY_TO_SHIP" },
  { label: "Shipped",       value: "SHIPPED" },
  { label: "In Transit",    value: "IN_TRANSIT" },
  { label: "Out for Del.",  value: "OUT_FOR_DELIVERY" },
  { label: "Delivered",     value: "DELIVERED" },
  { label: "Failed",        value: "DELIVERY_FAILED" },
]

interface Props {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}

export default async function ShipmentsPage({ searchParams }: Props) {
  const sp = await searchParams
  const status = sp.status ?? ""
  const q      = sp.q ?? ""
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10))
  const PAGE_SIZE = 20

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (q) {
    where.OR = [
      { shipmentNumber: { contains: q, mode: "insensitive" } },
      { trackingNumber: { contains: q, mode: "insensitive" } },
      { order: { orderNumber: { contains: q, mode: "insensitive" } } },
    ]
  }

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        courier: { select: { id: true, name: true } },
        order: {
          select: {
            id: true, orderNumber: true, total: true,
            user: { select: { name: true, email: true } },
            address: { select: { city: true, state: true } },
          },
        },
      },
    }),
    prisma.shipment.count({ where }),
  ])

  const pages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams({ ...(status && { status }), ...(q && { q }), page: "1", ...params })
    return `/admin/shipping/shipments?${p}`
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shipments</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total shipments</p>
        </div>
        <Button variant="brand" size="sm" asChild>
          <Link href="/admin/shipping/packing"><Plus className="h-4 w-4 mr-1.5" />Create from Packing</Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildUrl({ status: tab.value })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === tab.value
                ? "bg-brand-500/15 text-brand-400 border border-brand-500/25"
                : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {shipments.length === 0 ? (
          <div className="py-20 text-center">
            <Truck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">No shipments found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try changing filters or create a shipment from the packing queue</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Shipments table">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipment</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Courier / Tracking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {shipments.map((s) => {
                  const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, className: "bg-muted text-muted-foreground border-border" }
                  return (
                    <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-semibold">{s.shipmentNumber}</p>
                        {s.trackingNumber && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.trackingNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">#{s.order.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-xs truncate max-w-[120px]">{s.order.user?.name ?? s.order.user?.email ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{s.order.address?.city ?? ""}{s.order.address?.state ? `, ${s.order.address.state}` : ""}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{s.courier?.name ?? "Unassigned"}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/admin/shipping/shipments/${s.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl({ page: String(page - 1) })}>Previous</Link>
              </Button>
            )}
            {page < pages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl({ page: String(page + 1) })}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
