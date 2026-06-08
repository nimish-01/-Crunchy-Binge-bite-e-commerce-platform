"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, AlertTriangle, History, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { label: "Dashboard", href: "/inventory", icon: LayoutDashboard },
  { label: "Stock Management", href: "/inventory/stock", icon: Package },
  { label: "Low Stock Alerts", href: "/inventory/alerts", icon: AlertTriangle },
  { label: "History", href: "/inventory/history", icon: History },
]

export default function InventorySidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-border/40 bg-card min-h-screen">
      <div className="p-6 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-brand-500">🌾</span>
          <span>Inventory</span>
        </Link>
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
    </aside>
  )
}
