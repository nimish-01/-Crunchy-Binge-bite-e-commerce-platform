"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Menu, X, Search, LogOut, ExternalLink } from "lucide-react"
import { adminLogoutAction } from "@/lib/actions/auth"
import { cn, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import NotificationBell from "@/components/notifications/notification-bell"
import { NAV, type NavItem } from "@/components/layout/admin-nav-config"
import { Logo } from "@/components/layout/logo"

const SWIPE_CLOSE_THRESHOLD = 70

function MobileNavLink({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors touch-target",
        isActive
          ? "bg-brand-500/12 text-brand-400 font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", isActive ? "text-brand-400" : "text-muted-foreground group-hover:text-foreground")}
        aria-hidden
      />
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" aria-hidden />}
    </Link>
  )
}

export default function AdminMobileHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const touchStartX = useRef<number | null>(null)

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname?.startsWith(href)
  }

  function handleLogout() {
    startTransition(() => { adminLogoutAction() })
  }

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase()
    return NAV
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => (!item.superAdminOnly || isSuperAdmin) && (!q || item.label.toLowerCase().includes(q))
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [query, isSuperAdmin])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX < -SWIPE_CLOSE_THRESHOLD) setOpen(false)
    touchStartX.current = null
  }

  return (
    <header
      className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border/40 bg-background/95 backdrop-blur-md px-4 py-2.5 pt-safe"
      aria-label="Admin mobile header"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="touch-target shrink-0" aria-label="Open admin navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[300px] p-0 flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 pt-safe">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 font-semibold text-sm group min-w-0"
                aria-label="Crunchy Bingebite — go to storefront"
              >
                <Logo variant="mark" size={22} />
                <span className="truncate">Admin Panel</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors touch-target shrink-0"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search admin menu…"
                  aria-label="Search admin navigation"
                  className="w-full h-11 pl-9 pr-3 rounded-lg border border-border/60 bg-background text-sm outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 no-scrollbar" aria-label="Admin navigation">
              {filteredNav.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">No matching pages.</p>
              ) : (
                filteredNav.map((group) => (
                  <div key={group.group} className="mb-4">
                    <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                      {group.group}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <MobileNavLink
                          key={item.href}
                          item={item}
                          isActive={isActive(item.href)}
                          onNavigate={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </nav>

            {/* User footer */}
            <div className="p-3 border-t border-border/40 pb-safe">
              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 bg-accent/50 mb-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={session?.user?.image ?? ""} />
                  <AvatarFallback className="text-[10px] bg-brand-500/20 text-brand-400 font-semibold">
                    {getInitials(session?.user?.name ?? "A")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate leading-tight">{session?.user?.name ?? "Admin"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{session?.user?.role?.replace("_", " ")}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={isPending}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors disabled:opacity-50 touch-target"
              >
                <LogOut className="h-4 w-4" />
                {isPending ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/admin" className="flex items-center gap-1.5 font-semibold text-sm truncate" aria-label="Admin dashboard">
          <Logo variant="mark" size={20} />
          <span className="truncate">Admin</span>
        </Link>
      </div>

      <NotificationBell portal="admin" />
    </header>
  )
}
