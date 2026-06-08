import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice, formatDate } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Eye, ChevronRight, RotateCcw } from "lucide-react"

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "brand" | "outline"> = {
  PENDING: "warning", CONFIRMED: "brand", PACKED: "brand",
  DISPATCHED: "brand", DELIVERED: "success", CANCELLED: "destructive", REFUNDED: "secondary",
}

const PAGE_SIZE = 25

interface Props { searchParams: Promise<{ status?: string; after?: string }> }

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status, after } = await searchParams

  // Fetch one extra to detect if a next page exists
  const raw = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(after ? { cursor: { id: after }, skip: 1 } : {}),
  })

  const hasNextPage = raw.length > PAGE_SIZE
  const orders = raw.slice(0, PAGE_SIZE)
  const nextCursor = hasNextPage ? orders[orders.length - 1].id : null

  // Build base URL for filter/pagination links
  const baseHref = (s?: string) => s ? `/admin/orders?status=${s}` : "/admin/orders"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex flex-wrap gap-2">
          {["", "PENDING", "CONFIRMED", "DISPATCHED", "DELIVERED", "CANCELLED"].map((s) => (
            <Button key={s} variant={status === s || (!status && !s) ? "brand" : "outline"} size="sm" asChild>
              <Link href={baseHref(s || undefined)}>{s || "All"}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No orders found
                </td>
              </TableRow>
            ) : orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm font-medium">#{order.orderNumber}</TableCell>
                <TableCell className="text-sm">{order.user?.name ?? order.user?.email ?? "Guest"}</TableCell>
                <TableCell className="font-semibold text-brand-400">{formatPrice(order.total)}</TableCell>
                <TableCell>
                  <Badge variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "destructive" : "secondary"} className="text-xs">
                    {order.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLOR[order.status] ?? "default"} className="text-xs">{order.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/orders/${order.id}`}><Eye className="h-4 w-4" /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {orders.length} order{orders.length !== 1 ? "s" : ""} per page</span>
        <div className="flex gap-2">
          {after && (
            <Button variant="outline" size="sm" asChild>
              <Link href={baseHref(status)}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />First Page</Link>
            </Button>
          )}
          {nextCursor && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${baseHref(status)}&after=${nextCursor}`}>
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
