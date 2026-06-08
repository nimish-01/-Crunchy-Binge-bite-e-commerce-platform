import Link from "next/link"
import { Separator } from "@/components/ui/separator"

const LINKS = {
  Shop: [
    { label: "All Products", href: "/products" },
    { label: "Classic Flavors", href: "/products?category=classic-flavors" },
    { label: "Spicy Collection", href: "/products?category=spicy-collection" },
    { label: "Premium Range", href: "/products?category=premium-range" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact Us", href: "/contact" },
  ],
  Support: [
    { label: "FAQ", href: "/faq" },
    { label: "Shipping Policy", href: "/shipping" },
    { label: "Return Policy", href: "/returns" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card mt-20">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <span className="text-brand-500">🌾</span>
              <span>Binge Bite</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium flavored makhana. Roasted to perfection, seasoned with love. Guilt-free snacking for modern India.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="text-muted-foreground hover:text-brand-500 transition-colors text-sm">Instagram</a>
              <a href="#" className="text-muted-foreground hover:text-brand-500 transition-colors text-sm">Facebook</a>
            </div>
          </div>

          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <h4 className="font-semibold text-sm mb-4">{group}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Binge Bite. All rights reserved.</p>
          <div className="flex gap-1 items-center">
            <span>Made in</span>
            <span className="text-brand-500">India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
