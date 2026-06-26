import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Star } from "lucide-react"
import CustomerActions from "@/components/admin/customers/customer-actions"

export const metadata = { title: "Customer Profile — Admin" }

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/login")

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id:           true,
      name:         true,
      email:        true,
      phone:        true,
      isActive:     true,
      loyaltyPoints: true,
      loyaltyTier:  true,
      referralCode: true,
      createdAt:    true,
      _count: { select: { orders: true, reviews: true, wishlists: true } },
      orders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, orderNumber: true, status: true,
          subtotal: true, paymentStatus: true, createdAt: true,
        },
      },
      wallet: {
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } },
      },
      loyaltyTransactions: { orderBy: { createdAt: "desc" }, take: 10 },
      reviews: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true, slug: true } } },
      },
      referralsGiven: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { referee: { select: { name: true, email: true } } },
      },
    },
  })

  if (!user) notFound()

  const totalSpent = user.orders.reduce((sum, o) => sum + o.subtotal, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{user.name ?? "Unnamed Customer"}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            user.isActive
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : "bg-red-500/15 text-red-600 dark:text-red-400"
          }`}>
            {user.isActive ? "Active" : "Suspended"}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: user._count.orders },
          { label: "Total Spent", value: `₹${totalSpent.toFixed(0)}` },
          { label: "Loyalty Points", value: `${user.loyaltyPoints} (${user.loyaltyTier})` },
          { label: "Wallet Balance", value: `₹${(user.wallet?.balance ?? 0).toFixed(0)}` },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Admin Actions */}
      <CustomerActions customer={user} />

      {/* Recent Orders */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Recent Orders</h2>
        <div className="space-y-2">
          {user.orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
              <Link href={`/admin/orders/${o.id}`} className="font-mono text-brand-500 hover:underline">
                #{o.orderNumber}
              </Link>
              <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-IN")}</span>
              <span className="capitalize">{o.status.toLowerCase()}</span>
              <span className="font-medium">₹{o.subtotal.toFixed(0)}</span>
            </div>
          ))}
          {user.orders.length === 0 && <p className="text-muted-foreground text-sm">No orders yet</p>}
        </div>
      </section>

      {/* Wallet Transactions */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Wallet Transactions</h2>
        <div className="space-y-2">
          {(user.wallet?.transactions ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
              <span>{t.description}</span>
              <span className="text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("en-IN")}</span>
              <span className={t.amount >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                {t.amount >= 0 ? "+" : ""}₹{Math.abs(t.amount).toFixed(0)}
              </span>
            </div>
          ))}
          {(user.wallet?.transactions ?? []).length === 0 && (
            <p className="text-muted-foreground text-sm">No transactions</p>
          )}
        </div>
      </section>

      {/* Loyalty Transactions */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Loyalty History</h2>
        <div className="space-y-2">
          {user.loyaltyTransactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
              <span>{t.description}</span>
              <span className="text-muted-foreground">{t.type}</span>
              <span className={t.points >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                {t.points >= 0 ? "+" : ""}{t.points} pts
              </span>
            </div>
          ))}
          {user.loyaltyTransactions.length === 0 && (
            <p className="text-muted-foreground text-sm">No loyalty history</p>
          )}
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Reviews ({user._count.reviews})</h2>
        <div className="space-y-3">
          {user.reviews.map((r) => (
            <div key={r.id} className="text-sm py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/products/${r.product.slug}`} className="font-medium hover:underline">
                  {r.product.name}
                </Link>
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  r.status === "APPROVED" ? "bg-green-500/15 text-green-600" :
                  r.status === "REJECTED" ? "bg-red-500/15 text-red-600" : "bg-yellow-500/15 text-yellow-600"
                }`}>{r.status}</span>
              </div>
              {r.body && <p className="text-muted-foreground line-clamp-2">{r.body}</p>}
            </div>
          ))}
          {user.reviews.length === 0 && <p className="text-muted-foreground text-sm">No reviews</p>}
        </div>
      </section>
    </div>
  )
}
