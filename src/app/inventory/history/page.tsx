import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import InventoryHistoryFilters from "./inventory-history-filters"
import type { StockUpdateType, InventoryReason } from "@prisma/client"

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{
    q?: string
    updateType?: string
    reason?: string
    from?: string
    to?: string
    page?: string
  }>
}

const UPDATE_TYPE_LABELS: Record<StockUpdateType, string> = {
  ADD: "Received",
  REMOVE: "Removed",
  SET: "Adjusted",
  DAMAGED: "Damaged",
  EXPIRED: "Expired",
}

const REASON_LABELS: Partial<Record<InventoryReason, string>> = {
  STOCK_RECEIVED: "Stock Received",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
  DAMAGED: "Damaged",
  RETURNED: "Returned",
  ORDER_CANCELLED: "Order Cancelled",
  INITIAL_STOCK: "Initial Stock",
  ORDER_PLACED: "Order Placed",
}

function updateTypeBadgeVariant(type: StockUpdateType) {
  if (type === "ADD") return "success"
  if (type === "DAMAGED" || type === "EXPIRED") return "destructive"
  if (type === "REMOVE") return "secondary"
  return "outline"
}

export default async function InventoryHistoryPage({ searchParams }: Props) {
  const { q, updateType, reason, from, to, page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1"))

  const where: Record<string, unknown> = {}
  if (updateType) where.updateType = updateType
  if (reason) where.reason = reason
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }
  if (q) {
    where.variant = {
      product: { name: { contains: q, mode: "insensitive" } },
    }
  }

  const [total, logs] = await Promise.all([
    prisma.inventoryLog.count({ where }),
    prisma.inventoryLog.findMany({
      where,
      include: {
        variant: {
          select: {
            id: true,
            weight: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
        updatedByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildPageUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (updateType) params.set("updateType", updateType)
    if (reason) params.set("reason", reason)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    params.set("page", String(p))
    return `/inventory/history?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full audit trail of all stock changes.
        </p>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <InventoryHistoryFilters />
      </Suspense>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {total} {total === 1 ? "record" : "records"}
            {q || updateType || reason || from || to ? " (filtered)" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">No records found.</p>
          ) : (
            <div className="divide-y divide-border/30">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {log.variant.product.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {log.variant.weight} · {log.variant.sku}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        variant={updateTypeBadgeVariant(log.updateType)}
                        className="text-xs"
                      >
                        {UPDATE_TYPE_LABELS[log.updateType] ?? log.updateType}
                      </Badge>
                      {log.reason && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {REASON_LABELS[log.reason] ?? log.reason}
                        </Badge>
                      )}
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate max-w-sm">
                        {log.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.updatedByUser?.name ?? "System"} · {log.updatedByUser?.role} ·{" "}
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className={`text-sm font-bold ${log.quantityChange > 0 ? "text-green-400" : log.quantityChange < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.previousQuantity} → {log.newQuantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(currentPage - 1)}>Previous</Link>
              </Button>
            )}
            {currentPage < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(currentPage + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
