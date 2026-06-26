import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDate, formatPrice } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  APPROVED:  { label: "Approved",  className: "bg-green-500/10 text-green-400 border-green-500/25" },
  REJECTED:  { label: "Rejected",  className: "bg-red-500/10 text-red-400 border-red-500/25" },
  SHIPPED:   { label: "Shipped",   className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  DELIVERED: { label: "Delivered", className: "bg-green-500/10 text-green-400 border-green-500/25" },
}

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function ExchangesPage({ searchParams }: Props) {
  const sp = await searchParams
  const status = sp.status ?? ""
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10))
  const PAGE_SIZE = 20

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [exchanges, total] = await Promise.all([
    prisma.exchangeRequest.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { requestedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true, total: true } },
      },
    }),
    prisma.exchangeRequest.count({ where }),
  ])

  const TABS = [
    { label: "All",      value: "" },
    { label: "Pending",  value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Shipped",  value: "SHIPPED" },
    { label: "Rejected", value: "REJECTED" },
  ]

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams({ ...(status && { status }), page: "1", ...params })
    return `/admin/shipping/exchanges?${p}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Exchange Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} exchange requests</p>
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
        {exchanges.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No exchange requests</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Requested</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {exchanges.map((ex) => {
                const cfg = STATUS_CONFIG[ex.status] ?? { label: ex.status, className: "bg-muted text-muted-foreground border-border" }
                return (
                  <tr key={ex.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${ex.order.id}`} className="font-mono text-xs font-semibold hover:text-brand-400 transition-colors">
                        #{ex.order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatPrice(ex.order.total)}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-xs">{ex.user.name ?? ex.user.email}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{ex.reason}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{formatDate(ex.requestedAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
