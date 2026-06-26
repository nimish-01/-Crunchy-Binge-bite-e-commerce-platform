import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import KpiCard from "@/components/admin/analytics/kpi-card"
import {
  TrendingUp, ShoppingBag, Users, Package, Megaphone,
  AlertTriangle, Wallet, Gift, Star, RotateCcw,
} from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Analytics — Admin" }
export const revalidate = 300 // 5 min ISR

export default async function AnalyticsPage() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const now   = new Date()
  const today = startOfDay(now)
  const week  = startOfWeek(now, { weekStartsOn: 1 })
  const month = startOfMonth(now)
  const year  = startOfYear(now)

  const ns = { notIn: ["CANCELLED" as const, "REFUNDED" as const] }

  const [
    revToday, revWeek, revMonth, revYear,
    ordToday, ordMonth, avgOrd,
    newCust, totalCust,
    activePromos, lowStock, outOfStock,
    pendingReviews, walletTotal, loyaltyTotal,
    returnRate, cancelRate,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: today }, status: ns }, _sum: { subtotal: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: week  }, status: ns }, _sum: { subtotal: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: month }, status: ns }, _sum: { subtotal: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: year  }, status: ns }, _sum: { subtotal: true } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { createdAt: { gte: month } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: month }, status: ns }, _avg: { subtotal: true } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: month } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.promotion.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { stock: { gt: 0, lte: 10 }, isActive: true } }),
    prisma.productVariant.count({ where: { stock: 0, isActive: true } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.user.aggregate({ where: { role: "CUSTOMER" }, _sum: { loyaltyPoints: true } }),
    prisma.returnRequest.count({ where: { requestedAt: { gte: month } } }),
    prisma.order.count({ where: { createdAt: { gte: month }, status: "CANCELLED" } }),
  ])

  const sections = [
    {
      title: "Revenue",
      cards: [
        { title: "Revenue Today",     value: revToday._sum.subtotal ?? 0, icon: TrendingUp, color: "text-green-500",  prefix: "₹" },
        { title: "Revenue This Week", value: revWeek._sum.subtotal ?? 0,  icon: TrendingUp, color: "text-blue-500",   prefix: "₹" },
        { title: "Revenue This Month",value: revMonth._sum.subtotal ?? 0, icon: TrendingUp, color: "text-purple-500", prefix: "₹" },
        { title: "Revenue This Year", value: revYear._sum.subtotal ?? 0,  icon: TrendingUp, color: "text-brand-400",  prefix: "₹" },
      ],
    },
    {
      title: "Orders",
      cards: [
        { title: "Orders Today",     value: ordToday, icon: ShoppingBag, color: "text-blue-500" },
        { title: "Orders This Month",value: ordMonth, icon: ShoppingBag, color: "text-purple-500" },
        { title: "Avg Order Value",  value: avgOrd._avg.subtotal ?? 0, icon: TrendingUp, color: "text-green-500", prefix: "₹" },
        { title: "Returns / Month",  value: returnRate, icon: RotateCcw, color: "text-orange-500", subtitle: `Cancellations: ${cancelRate}` },
      ],
    },
    {
      title: "Customers",
      cards: [
        { title: "Total Customers",   value: totalCust, icon: Users, color: "text-blue-500" },
        { title: "New This Month",    value: newCust,   icon: Users, color: "text-green-500" },
        { title: "Returning",         value: totalCust - newCust, icon: Users, color: "text-purple-500" },
        { title: "Active Promotions", value: activePromos, icon: Megaphone, color: "text-brand-400" },
      ],
    },
    {
      title: "Operations",
      cards: [
        { title: "Low Stock Variants",    value: lowStock,   icon: AlertTriangle, color: "text-yellow-500" },
        { title: "Out of Stock",          value: outOfStock, icon: AlertTriangle, color: "text-red-500" },
        { title: "Pending Reviews",       value: pendingReviews, icon: Star, color: "text-orange-500" },
        { title: "Wallet Balance Issued", value: walletTotal._sum.balance ?? 0, icon: Wallet, color: "text-teal-500", prefix: "₹" },
      ],
    },
  ]

  const quickLinks = [
    { label: "Revenue", href: "/admin/analytics/revenue",  icon: TrendingUp },
    { label: "Orders",  href: "/admin/analytics/orders",   icon: ShoppingBag },
    { label: "Products",href: "/admin/analytics/products", icon: Package },
    { label: "Live",    href: "/admin/analytics/live",     icon: Megaphone },
    { label: "Reports", href: "/admin/analytics/reports",  icon: Gift },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Business intelligence dashboard · Updated every 5 min</p>
        </div>
        <div className="flex gap-2">
          {quickLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <AnalyticsNav />

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{section.title}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {section.cards.map((card) => (
              <KpiCard
                key={card.title}
                title={card.title}
                value={typeof card.value === "number" && card.prefix === "₹"
                  ? (card.value >= 100000 ? `${(card.value / 100000).toFixed(1)}L` :
                     card.value >= 1000   ? `${(card.value / 1000).toFixed(1)}K`  :
                     card.value.toFixed(0))
                  : card.value}
                icon={card.icon}
                color={card.color}
                prefix={card.prefix}
                subtitle={(card as { subtitle?: string }).subtitle}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Loyalty highlight */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-medium">Loyalty Programme</span>
          </div>
          <p className="text-2xl font-bold">{(loyaltyTotal._sum.loyaltyPoints ?? 0).toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-1">Total points outstanding across all customers</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Reviews Queue</span>
          </div>
          <p className="text-2xl font-bold">{pendingReviews}</p>
          <p className="text-xs text-muted-foreground mt-1">Reviews awaiting moderation</p>
          {pendingReviews > 0 && (
            <Link href="/admin/reviews?status=PENDING" className="text-xs text-brand-500 hover:underline mt-1 block">
              Moderate now →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
