"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { ShoppingCart, Search, Bell, User, Menu, LogOut, Package, Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useCart } from "@/contexts/cart-context"
import { useNotifications } from "@/contexts/notification-context"
import { getInitials } from "@/lib/utils"
import CartDrawer from "@/components/shop/cart-drawer"
import { useState } from "react"

const NAV_LINKS = [
  { label: "Shop All", href: "/products" },
  { label: "Classic", href: "/products?category=classic-flavors" },
  { label: "Spicy", href: "/products?category=spicy-collection" },
  { label: "Premium", href: "/products?category=premium-range" },
]

export default function Header() {
  const { data: session } = useSession()
  const { itemCount } = useCart()
  const { unreadCount } = useNotifications()
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="text-brand-500">🌾</span>
          <span className="hidden sm:block">Binge Bite</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products"><Search className="h-5 w-5" /></Link>
          </Button>

          {/* Cart */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge variant="brand" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {itemCount > 9 ? "9+" : itemCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0">
              <CartDrawer onClose={() => setCartOpen(false)} />
            </SheetContent>
          </Sheet>

          {session ? (
            <>
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative hidden sm:flex" asChild>
                <Link href="/notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-500 text-xs text-zinc-950 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={session.user?.image ?? ""} />
                      <AvatarFallback className="text-xs bg-brand-500 text-zinc-950">
                        {getInitials(session.user?.name ?? session.user?.email ?? "U")}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3 opacity-50 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="font-medium">{session.user?.name ?? "Customer"}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/profile"><User className="mr-2 h-4 w-4" />My Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/orders"><Package className="mr-2 h-4 w-4" />My Orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/notifications"><Bell className="mr-2 h-4 w-4" />Notifications{unreadCount > 0 && <Badge variant="brand" className="ml-auto">{unreadCount}</Badge>}</Link></DropdownMenuItem>
                  {(session.user?.role === "ADMIN" || session.user?.role === "SUPER_ADMIN") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/admin"><Settings className="mr-2 h-4 w-4" />Admin Panel</Link></DropdownMenuItem>
                    </>
                  )}
                  {session.user?.role === "INVENTORY_MANAGER" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/inventory"><Package className="mr-2 h-4 w-4" />Inventory</Link></DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="brand" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          {/* Mobile Nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="flex flex-col gap-4 mt-8">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg font-medium hover:text-brand-500 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
