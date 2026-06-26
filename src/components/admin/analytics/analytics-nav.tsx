"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, TrendingUp, ShoppingBag, Users, Package,
  Warehouse, Ticket, Megaphone, Star, Gift, MessageSquare,
  Truck, Activity, FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Executive",   href: "/admin/analytics",             icon: LayoutDashboard },
  { label: "Revenue",     href: "/admin/analytics/revenue",     icon: TrendingUp },
  { label: "Orders",      href: "/admin/analytics/orders",      icon: ShoppingBag },
  { label: "Customers",   href: "/admin/analytics/customers",   icon: Users },
  { label: "Products",    href: "/admin/analytics/products",    icon: Package },
  { label: "Inventory",   href: "/admin/analytics/inventory",   icon: Warehouse },
  { label: "Coupons",     href: "/admin/analytics/coupons",     icon: Ticket },
  { label: "Promotions",  href: "/admin/analytics/promotions",  icon: Megaphone },
  { label: "Loyalty",     href: "/admin/analytics/loyalty",     icon: Gift },
  { label: "Reviews",     href: "/admin/analytics/reviews",     icon: Star },
  { label: "Live",        href: "/admin/analytics/live",        icon: Activity },
  { label: "Reports",     href: "/admin/analytics/reports",     icon: FileText },
]

export default function AnalyticsNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 flex-wrap mb-6">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const isActive = href === "/admin/analytics"
          ? pathname === href
          : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isActive
                ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
