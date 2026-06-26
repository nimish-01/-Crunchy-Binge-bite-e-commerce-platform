import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDate, formatPrice } from "@/lib/utils"
import { RotateCcw, ArrowRight } from "lucide-react"
import { ReturnActions } from "./return-actions"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  APPROVED:  { label: "Approved",  className: "bg-green-500/10 text-green-400 border-green-500/25" },
  REJECTED:  { label: "Rejected",  className: "bg-red-500/10 text-red-400 border-red-500/25" },
  PICKED:    { label: "Picked",    className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  RECEIVED:  { label: "Received",  className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" },
  COMPLETED: { label: "Completed", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25" },
  REFUNDED:  { label: "Refunded",  className: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
}

const TABS = [
  { label: "All",       value: "" },
  { label: "Pending",   value: "PENDING" },
  { label: "Approved",  value: "APPROVED" },
  { label: "Picked",    value: "PICKED" },
  { label: "Received",  value: "RECEIVED" },
  { label: "Refunded",  value: "REFUNDED" },
  { label: "Rejected",  value: "REJECTED" },
]

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function ReturnsPage({ searchParams }: Props) {
  const sp = await searchParams
  const status = sp.status ?? ""
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10))
  const PAGE_SIZE = 20

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { requestedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: {
          select: {
            id: true, orderNumber: true, total: true,
            items: { take: 1, include: { product: { select: { name: true, images: true } } } },
          },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
  ])

  const pages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams({ ...(status && { status }), page: "1", ...params })
    return `/admin/shipping/returns?${p}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Returns</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} return requests</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((tab) => (
          <Link key={tab.value} href={buildUrl({ status: tab.value })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === tab.value ? "bg-brand-500/15 text-brand-400 border border-brand-500/25" : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
            }`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {returns.length === 0 ? (
          <div className="py-16 text-center">
            <RotateCcw className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No returns found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {returns.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, className: "bg-muted text-muted-foreground border-border" }
              const firstItem = r.order.items[0]
              return (
                <div key={r.id} className="px-5 py-4 hover:bg-accent/20 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      {firstItem?.product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={firstItem.product.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Link href={`/admin/orders/${r.order.id}`} className="font-mono text-xs font-semibold hover:text-brand-400 transition-colors">
                            #{r.order.orderNumber}
                          </Link>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{r.user.name ?? r.user.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
                        <p className="text-xs text-muted-foreground">Requested {formatDate(r.requestedAt)} · Order value {formatPrice(r.order.total)}</p>
                      </div>
                    </div>
                    <ReturnActions
                      returnId={r.id}
                      currentStatus={r.status}
                      adminNotes={r.adminNotes ?? ""}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">Page {page} of {pages}</p>
          <div className="flex gap-2">
            {page > 1 && <Button variant="outline" size="sm" asChild><Link href={buildUrl({ page: String(page - 1) })}>Previous</Link></Button>}
            {page < pages && <Button variant="outline" size="sm" asChild><Link href={buildUrl({ page: String(page + 1) })}>Next</Link></Button>}
          </div>
        </div>
      )}
    </div>
  )
}
