import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, getInitials, formatPrice } from "@/lib/utils"
import Link from "next/link"
import { Wallet, Gift, Users2, Star, Package, Heart, ChevronRight, Shield } from "lucide-react"

const TIER_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  BRONZE:   { label: "Bronze",   className: "text-amber-600 border-amber-500/30 bg-amber-500/6",  icon: "🥉" },
  SILVER:   { label: "Silver",   className: "text-slate-400 border-slate-400/30 bg-slate-400/6",  icon: "🥈" },
  GOLD:     { label: "Gold",     className: "text-yellow-500 border-yellow-500/30 bg-yellow-500/6", icon: "🥇" },
  PLATINUM: { label: "Platinum", className: "text-cyan-400 border-cyan-400/30 bg-cyan-400/6",     icon: "💎" },
}

export default async function ProfilePage() {
  const session = await auth()
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: {
      _count: { select: { orders: true, wishlists: true, reviews: true } },
      wallet: { select: { balance: true } },
    },
  })
  if (!user) return null

  const tier = TIER_CONFIG[user.loyaltyTier] ?? TIER_CONFIG.BRONZE

  const QUICK_LINKS = [
    {
      label: "My Orders",
      href: "/orders",
      icon: Package,
      value: user._count.orders.toString(),
      sub: "orders",
    },
    {
      label: "Binge Points",
      href: "/profile/loyalty",
      icon: Gift,
      value: user.loyaltyPoints.toString(),
      sub: "points",
      highlight: true,
    },
    {
      label: "Wallet Balance",
      href: "/profile/wallet",
      icon: Wallet,
      value: `₹${(user.wallet?.balance ?? 0).toFixed(0)}`,
      sub: "available",
      green: true,
    },
    {
      label: "My Reviews",
      href: "/profile/reviews",
      icon: Star,
      value: user._count.reviews.toString(),
      sub: "reviews",
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Profile card */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-2xl bg-brand-500/15 flex items-center justify-center text-xl font-bold text-brand-400 shrink-0">
            {getInitials(user.name ?? user.email ?? "U")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold">{user.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
              </div>
              <Badge
                variant="outline"
                className={`text-xs font-semibold shrink-0 ${tier.className}`}
              >
                {tier.icon} {tier.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-border/50 bg-card p-4 hover:border-brand-500/30 transition-all duration-200 hover:shadow-brand-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-7 w-7 rounded-lg bg-brand-500/8 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-brand-400" />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className={`text-2xl font-bold tabular-nums ${item.green ? "text-green-500" : item.highlight ? "text-brand-400" : ""}`}>
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </Link>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/40">
          <p className="text-sm font-semibold">Quick Actions</p>
        </div>
        <div className="divide-y divide-border/30">
          {[
            { label: "Manage Addresses",  href: "/profile/addresses",  icon: Heart },
            { label: "Wishlist",          href: "/profile/wishlist",   icon: Heart },
            { label: "Referral Program",  href: "/profile/referrals",  icon: Users2 },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Referral code */}
      <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Users2 className="h-4 w-4 text-brand-400" />
              Your Referral Code
            </p>
            <p className="text-xs text-muted-foreground">Share and earn rewards when friends order</p>
          </div>
          <div className="flex items-center gap-3">
            <code className="font-mono font-bold text-brand-400 bg-brand-500/15 px-3 py-1.5 rounded-lg text-sm tracking-wider">
              {user.referralCode.slice(0, 8).toUpperCase()}
            </code>
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/referrals">Manage</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
