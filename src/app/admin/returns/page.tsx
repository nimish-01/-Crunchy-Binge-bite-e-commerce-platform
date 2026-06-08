import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatPrice } from "@/lib/utils"
import { ReturnActionsButton } from "./return-actions-button"

const PAGE_SIZE = 20

const STATUS_COLORS = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  COMPLETED: "secondary",
} as const

interface Props {
  searchParams: Promise<{ status?: string; cursor?: string }>
}

export default async function AdminReturnsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/admin/login")
  }

  const { status, cursor } = await searchParams

  const where = status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" } : {}

  const items = await prisma.returnRequest.findMany({
    where,
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      order: { select: { id: true, orderNumber: true, total: true, deliveredAt: true } },
    },
  })

  const hasNextPage = items.length > PAGE_SIZE
  const data = hasNextPage ? items.slice(0, PAGE_SIZE) : items

  const STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "COMPLETED"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Return Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and manage customer return requests</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/admin/returns?status=${s}` : "/admin/returns"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              (status ?? "") === s
                ? "bg-brand-500/15 text-brand-400"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {s || "All"}
          </Link>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center text-muted-foreground">
          No return requests found
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${r.order.id}`} className="font-mono text-xs text-brand-400 hover:underline">
                      {r.order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(r.order.total)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.user.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.user.email}</p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-xs text-muted-foreground">{r.reason}</p>
                    {r.adminNotes && (
                      <p className="truncate text-xs text-foreground mt-0.5">Note: {r.adminNotes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(r.requestedAt)}
                    {r.order.deliveredAt && (
                      <p>Delivered: {formatDate(r.order.deliveredAt)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[r.status] ?? "default"} className="text-xs">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {r.status !== "COMPLETED" && (
                      <ReturnActionsButton returnId={r.id} currentStatus={r.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Link
            href={`/admin/returns?${status ? `status=${status}&` : ""}cursor=${data[data.length - 1].id}`}
            className="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
          >
            Load more
          </Link>
        </div>
      )}
    </div>
  )
}
