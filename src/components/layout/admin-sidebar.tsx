"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, Ticket,
  Bell, Image as ImageIcon, BarChart3, Settings, Warehouse,
  RotateCcw, Megaphone, UserCheck, Star, Award, TrendingUp,
  Globe, ChevronRight, LogOut, ExternalLink,
  Truck, BoxIcon, MapPin, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { logoutAdminAction } from "@/lib/actions/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  superAdminOnly?: boolean
  badge?: string
}

type NavGroup = {
  group: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard",   href: "/admin",            icon: LayoutDashboard },
      { label: "Analytics",   href: "/admin/analytics",  icon: TrendingUp },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Products",    href: "/admin/products",   icon: Package },
      { label: "Categories",  href: "/admin/categories", icon: Tag },
      { label: "Media Library", href: "/admin/media",    icon: ImageIcon },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Orders",      href: "/admin/orders",     icon: ShoppingBag },
      { label: "Returns",     href: "/admin/returns",    icon: RotateCcw },
      { label: "Coupons",     href: "/admin/coupons",    icon: Ticket },
      { label: "Promotions",  href: "/admin/promotions", icon: Megaphone },
    ],
  },
  {
    group: "Customers",
    items: [
      { label: "Customers",   href: "/admin/customers",  icon: UserCheck },
      { label: "Reviews",     href: "/admin/reviews",    icon: Star },
      { label: "Loyalty",     href: "/admin/loyalty",    icon: Award },
      { label: "Users",       href: "/admin/users",      icon: Users },
    ],
  },
  {
    group: "Shipping",
    items: [
      { label: "Dashboard",       href: "/admin/shipping",           icon: Truck },
      { label: "Shipments",       href: "/admin/shipping/shipments", icon: Package },
      { label: "Packing Queue",   href: "/admin/shipping/packing",   icon: BoxIcon },
      { label: "Returns",         href: "/admin/shipping/returns",   icon: RotateCcw },
      { label: "Exchanges",       href: "/admin/shipping/exchanges", icon: RefreshCw },
      { label: "Delivery Zones",  href: "/admin/shipping/zones",     icon: MapPin },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Inventory",     href: "/admin/inventory",     icon: Warehouse },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Homepage CMS", href: "/admin/cms/homepage", icon: Globe },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings",    href: "/admin/settings",   icon: Settings, superAdminOnly: true },
    ],
  },
]

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-brand-500/12 text-brand-400 font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-brand-400" : "text-muted-foreground group-hover:text-foreground"
        )}
        aria-hidden
      />
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && (
        <div className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
      )}
    </Link>
  )
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname?.startsWith(href)
  }

  return (
    <aside
      className="w-60 shrink-0 hidden md:flex flex-col border-r border-border/40 bg-card min-h-screen"
      aria-label="Admin navigation"
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border/40">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-base group"
          aria-label="Binge Bite — go to storefront"
        >
          <span className="text-brand-500 text-lg">🌾</span>
          <span className="flex-1">Binge Bite</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <p className="text-[11px] text-muted-foreground mt-0.5 pl-7">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 no-scrollbar">
        {NAV.map((group) => {
          const visible = group.items.filter((i) => !i.superAdminOnly || isSuperAdmin)
          if (!visible.length) return null
          return (
            <div key={group.group} className="mb-4">
              <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => (
                  <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border/40">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 bg-accent/50 mb-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback className="text-[10px] bg-brand-500/20 text-brand-400 font-semibold">
              {getInitials(session?.user?.name ?? "A")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-tight">
              {session?.user?.name ?? "Admin"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {session?.user?.role?.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={() => logoutAdminAction()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
