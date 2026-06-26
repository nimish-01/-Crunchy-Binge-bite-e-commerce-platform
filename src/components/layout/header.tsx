"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  ShoppingCart, Search, Bell, User, Menu, LogOut,
  Package, Settings, ChevronDown, X, Heart, Wallet,
  Star, Gift, MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useCart } from "@/contexts/cart-context"
import { useNotifications } from "@/contexts/notification-context"
import { getInitials } from "@/lib/utils"
import CartDrawer from "@/components/shop/cart-drawer"
import ThemeToggle from "@/components/ui/theme-toggle"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Shop All",  href: "/products" },
  { label: "Classic",   href: "/products?category=classic-flavors" },
  { label: "Spicy",     href: "/products?category=spicy-collection" },
  { label: "Premium",   href: "/products?category=premium-range" },
]

export default function Header() {
  const { data: session } = useSession()
  const { itemCount } = useCart()
  const { unreadCount } = useNotifications()
  const pathname = usePathname()

  const [cartOpen, setCartOpen]       = useState(false)
  const [searchOpen, setSearchOpen]   = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [searchOpen])

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [pathname])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <>
      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-label="Search"
        >
          <div className="container flex items-center gap-4 h-16 border-b border-border/50">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search makhana flavors…"
                className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                aria-label="Search products"
              />
            </form>
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery("") }}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="container py-6">
            <p className="text-sm text-muted-foreground mb-4">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {["Peri Peri", "Himalayan Salt", "Dark Chocolate", "Cheese & Herb", "Butter Caramel"].map((term) => (
                <button
                  key={term}
                  onClick={() => { setSearchQuery(term); handleSearchSubmit({ preventDefault: () => {} } as React.FormEvent) }}
                  className="px-3 py-1.5 rounded-full border border-border/60 text-sm hover:border-brand-500/60 hover:text-brand-400 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-all duration-250",
          scrolled
            ? "border-border/60 bg-background/95 backdrop-blur-md shadow-elevation-1"
            : "border-transparent bg-background/80 backdrop-blur-sm"
        )}
      >
        <div className="container flex h-15 items-center gap-4">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-[1.1rem] tracking-tight shrink-0 mr-2"
            aria-label="Binge Bite home"
          >
            <span className="text-brand-500 text-xl leading-none" aria-hidden>🌾</span>
            <span className="hidden sm:block">Binge Bite</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const active = link.href === "/products"
                ? pathname === "/products"
                : pathname?.includes(link.href.split("?")[1] ?? "__")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-2 text-sm rounded-lg transition-colors",
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-500 rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 ml-auto">

            {/* Theme */}
            <ThemeToggle />

            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="touch-target"
            >
              <Search className="h-[1.1rem] w-[1.1rem]" />
            </Button>

            {/* Wishlist — logged-in only */}
            {session && (
              <Button variant="ghost" size="icon" asChild className="hidden sm:flex touch-target">
                <Link href="/profile/wishlist" aria-label="Wishlist">
                  <Heart className="h-[1.1rem] w-[1.1rem]" />
                </Link>
              </Button>
            )}

            {/* Cart */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative touch-target"
                  aria-label={`Cart, ${itemCount} item${itemCount !== 1 ? "s" : ""}`}
                >
                  <ShoppingCart className="h-[1.1rem] w-[1.1rem]" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-brand-500 text-[10px] font-bold text-zinc-950 flex items-center justify-center leading-none">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-[420px] p-0">
                <CartDrawer onClose={() => setCartOpen(false)} />
              </SheetContent>
            </Sheet>

            {session ? (
              <>
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hidden sm:flex touch-target"
                  asChild
                >
                  <Link href="/notifications" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}>
                    <Bell className="h-[1.1rem] w-[1.1rem]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-2 pl-1.5 pr-2 h-9 hidden sm:flex"
                      aria-label="Account menu"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={session.user?.image ?? ""} />
                        <AvatarFallback className="text-xs bg-brand-500/20 text-brand-400 font-semibold">
                          {getInitials(session.user?.name ?? session.user?.email ?? "U")}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-3 w-3 opacity-40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60" sideOffset={8}>
                    <DropdownMenuLabel className="pb-2">
                      <p className="font-semibold text-sm leading-tight">
                        {session.user?.name ?? "Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {session.user?.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="h-4 w-4" />My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders">
                        <Package className="h-4 w-4" />My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/wishlist">
                        <Heart className="h-4 w-4" />Wishlist
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/wallet">
                        <Wallet className="h-4 w-4" />Wallet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/notifications">
                        <Bell className="h-4 w-4" />
                        Notifications
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-[10px] h-4 px-1">
                            {unreadCount}
                          </Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>

                    {(session.user?.role === "ADMIN" || session.user?.role === "SUPER_ADMIN") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Settings className="h-4 w-4" />Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {session.user?.role === "INVENTORY_MANAGER" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/inventory">
                            <Package className="h-4 w-4" />Inventory
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="brand" size="sm" asChild className="hidden sm:flex">
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden touch-target"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
                {/* Mobile menu header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                  <Link
                    href="/"
                    className="flex items-center gap-2 font-bold"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="text-brand-500">🌾</span>
                    Binge Bite
                  </Link>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Nav links */}
                <nav className="px-3 py-4 border-b border-border/50" aria-label="Mobile navigation">
                  <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Shop
                  </p>
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Account links */}
                {session ? (
                  <div className="px-3 py-4 flex-1">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-accent mb-4">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={session.user?.image ?? ""} />
                        <AvatarFallback className="text-xs bg-brand-500/20 text-brand-400 font-semibold">
                          {getInitials(session.user?.name ?? "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{session.user?.name ?? "Customer"}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                      </div>
                    </div>
                    <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Account
                    </p>
                    {[
                      { label: "My Profile",  href: "/profile",          icon: User },
                      { label: "My Orders",   href: "/orders",           icon: Package },
                      { label: "Wishlist",    href: "/profile/wishlist", icon: Heart },
                      { label: "Wallet",      href: "/profile/wallet",   icon: Wallet },
                      { label: "Loyalty",     href: "/profile/loyalty",  icon: Star },
                      { label: "Referrals",   href: "/profile/referrals",icon: Gift },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-6 flex-1">
                    <p className="text-sm text-muted-foreground mb-4">
                      Sign in to view your orders, wishlist, and more.
                    </p>
                    <Button variant="brand" className="w-full" asChild>
                      <Link href="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                    </Button>
                    <Button variant="ghost" className="w-full mt-2" asChild>
                      <Link href="/register" onClick={() => setMobileOpen(false)}>Create Account</Link>
                    </Button>
                  </div>
                )}

                {/* Sign out */}
                {session && (
                  <div className="px-5 py-4 border-t border-border/50">
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

          </div>
        </div>
      </header>
    </>
  )
}
