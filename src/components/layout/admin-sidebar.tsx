"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, Ticket,
  Bell, Image, BarChart3, Settings, Warehouse, ChevronRight, RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Returns", href: "/admin/returns", icon: RotateCcw },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { label: "Coupons", href: "/admin/coupons", icon: Ticket },
  { label: "Media Library", href: "/admin/media", icon: Image },
  { label: "Homepage CMS", href: "/admin/cms/homepage", icon: Image },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings, superAdminOnly: true },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-border/40 bg-card min-h-screen">
      <div className="p-6 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-brand-500">🌾</span>
          <span>Admin Panel</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors group",
                isActive
                  ? "bg-brand-500/15 text-brand-400 font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          Logged in as <span className="text-foreground font-medium">{session?.user?.role}</span>
        </p>
      </div>
    </aside>
  )
}
