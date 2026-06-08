import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { User, Package, Heart, Bell, MapPin } from "lucide-react"

const ACCOUNT_NAV = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Addresses", href: "/profile/addresses", icon: MapPin },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Notifications", href: "/notifications", icon: Bell },
]

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <>
      <Header />
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="md:col-span-1">
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-1">
              {ACCOUNT_NAV.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </aside>
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  )
}
