import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import Link from "next/link"
import { ShoppingBag, Users, Star, AlertTriangle } from "lucide-react"
import LiveRefresh from "@/components/admin/analytics/live-refresh"

export const metadata = { title: "Live Dashboard — Admin" }

export default async function LivePage() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const [orders, customers, reviews, alerts, referrals] = await Promise.all([
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        items: { take: 1, include: { product: { select: { name: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        user:    { select: { name: true } },
      },
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      take: 8,
      orderBy: { stock: "asc" },
      include: { product: { select: { name: true } } },
    }),
    prisma.referral.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        referrer: { select: { name: true } },
        referee:  { select: { name: true } },
      },
    }),
  ])

  const statusColor: Record<string, string> = {
    PENDING:    "bg-yellow-500/15 text-yellow-600",
    CONFIRMED:  "bg-blue-500/15 text-blue-500",
    PACKED:     "bg-purple-500/15 text-purple-500",
    DISPATCHED: "bg-orange-500/15 text-orange-500",
    DELIVERED:  "bg-green-500/15 text-green-600",
    CANCELLED:  "bg-red-500/15 text-red-500",
    REFUNDED:   "bg-gray-500/15 text-gray-500",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Dashboard</h1>
          <p className="text-muted-foreground text-sm">Real-time activity feed</p>
        </div>
        <LiveRefresh />
      </div>

      <AnalyticsNav />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Orders */}
        <div className="bg-card border border-border/50 rounded-xl">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <ShoppingBag className="h-4 w-4 text-brand-400" />
            <h2 className="font-semibold text-sm">Latest Orders</h2>
          </div>
          <div className="divide-y divide-border/50">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium font-mono hover:underline text-brand-400">
                    #{o.orderNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">{o.user?.name ?? "Guest"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[o.status] ?? ""}`}>
                  {o.status}
                </span>
                <span className="text-sm font-medium">₹{o.subtotal.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* New Customers */}
        <div className="bg-card border border-border/50 rounded-xl">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <Users className="h-4 w-4 text-blue-400" />
            <h2 className="font-semibold text-sm">New Customers</h2>
          </div>
          <div className="divide-y divide-border/50">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">
                  {(c.name ?? c.email ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-card border border-border/50 rounded-xl">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <Star className="h-4 w-4 text-yellow-400" />
            <h2 className="font-semibold text-sm">Pending Reviews ({reviews.length})</h2>
          </div>
          <div className="divide-y divide-border/50">
            {reviews.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">All caught up!</p>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} className={`text-xs ${s <= r.rating ? "text-yellow-500" : "text-muted-foreground"}`}>★</span>
                    ))}
                  </div>
                  <p className="text-xs font-medium">{r.product.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{r.body?.slice(0, 80) ?? "—"}</p>
              </div>
            ))}
            {reviews.length > 0 && (
              <div className="px-4 py-2">
                <Link href="/admin/reviews?status=PENDING" className="text-xs text-brand-500 hover:underline">
                  Moderate all →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-card border border-border/50 rounded-xl">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h2 className="font-semibold text-sm">Inventory Alerts</h2>
          </div>
          <div className="divide-y divide-border/50">
            {alerts.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">All stock levels OK</p>
            )}
            {alerts.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{v.product.name}</p>
                  <p className="text-xs text-muted-foreground">{v.weight}</p>
                </div>
                <span className={`text-sm font-bold ${v.stock === 0 ? "text-red-500" : "text-yellow-500"}`}>
                  {v.stock === 0 ? "OUT" : `${v.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
