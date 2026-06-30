"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { adminLogoutAction } from "@/lib/actions/auth"
import { ChevronRight, LogOut, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import NotificationBell from "@/components/notifications/notification-bell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { NAV, type NavItem } from "@/components/layout/admin-nav-config"

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
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(() => { adminLogoutAction() })
  }

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
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-base group min-w-0"
            aria-label="Crunchy Bingebite — go to storefront"
          >
            <span className="text-brand-500 text-lg shrink-0">🌾</span>
            <span className="flex-1 truncate">Crunchy Bingebite</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
          <NotificationBell portal="admin" />
        </div>
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
