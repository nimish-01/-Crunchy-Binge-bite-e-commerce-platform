"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { inventoryLogoutAction } from "@/lib/actions/auth"
import { LayoutDashboard, Package, AlertTriangle, History, Bell, ChevronRight, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import NotificationBell from "@/components/notifications/notification-bell"

const NAV = [
  { label: "Dashboard", href: "/inventory", icon: LayoutDashboard },
  { label: "Stock Management", href: "/inventory/stock", icon: Package },
  { label: "Low Stock Alerts", href: "/inventory/alerts", icon: AlertTriangle },
  { label: "History", href: "/inventory/history", icon: History },
  { label: "Notifications", href: "/inventory/notifications", icon: Bell },
]

export default function InventorySidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(() => { inventoryLogoutAction() })
  }

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-border/40 bg-card min-h-screen">
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg min-w-0">
            <span className="text-brand-500 shrink-0">🌾</span>
            <span className="truncate">Inventory</span>
          </Link>
          <NotificationBell portal="inventory" />
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== "/inventory" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
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

      {/* User footer */}
      <div className="p-3 border-t border-border/40">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 bg-accent/50 mb-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback className="text-[10px] bg-brand-500/20 text-brand-400 font-semibold">
              {getInitials(session?.user?.name ?? "I")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-tight">
              {session?.user?.name ?? "Inventory"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {session?.user?.role?.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {isPending ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </aside>
  )
}
