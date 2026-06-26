"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Package, Heart, Bell, MapPin, Wallet, Gift, Users2, Star } from "lucide-react"
import { cn } from "@/lib/utils"

const ACCOUNT_NAV = [
  { label: "Profile",       href: "/profile",            icon: User },
  { label: "Orders",        href: "/orders",             icon: Package },
  { label: "Addresses",     href: "/profile/addresses",  icon: MapPin },
  { label: "Wishlist",      href: "/profile/wishlist",   icon: Heart },
  { label: "Wallet",        href: "/profile/wallet",     icon: Wallet },
  { label: "Loyalty",       href: "/profile/loyalty",    icon: Gift },
  { label: "Referrals",     href: "/profile/referrals",  icon: Users2 },
  { label: "My Reviews",    href: "/profile/reviews",    icon: Star },
  { label: "Notifications", href: "/notifications",      icon: Bell },
]

interface AccountNavProps {
  mobile?: boolean
}

export default function AccountNav({ mobile }: AccountNavProps) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <nav
        className="flex md:hidden gap-2 overflow-x-auto no-scrollbar pb-4 mb-6"
        aria-label="Account navigation"
      >
        {ACCOUNT_NAV.map(({ label, href, icon: Icon }) => {
          const active = href === "/profile"
            ? pathname === "/profile"
            : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 shrink-0 px-3.5 py-2 rounded-full border text-sm transition-colors",
                active
                  ? "border-brand-500/40 bg-brand-500/10 text-brand-400 font-medium"
                  : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <aside className="md:col-span-1 hidden md:block">
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden sticky top-24">
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            My Account
          </p>
        </div>
        <nav className="p-2 space-y-0.5" aria-label="Account navigation">
          {ACCOUNT_NAV.map(({ label, href, icon: Icon }) => {
            const active = href === "/profile"
              ? pathname === "/profile"
              : pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-brand-500/10 text-brand-400 font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-400" : "")} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
