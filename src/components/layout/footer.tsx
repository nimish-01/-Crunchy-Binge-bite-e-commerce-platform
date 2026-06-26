import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { getSiteSettings } from "@/lib/settings"
import { Shield, Truck, RefreshCw, Headphones, Instagram, Facebook, Twitter, Youtube, Linkedin } from "lucide-react"

const LINKS = {
  Shop: [
    { label: "All Products",     href: "/products" },
    { label: "Classic Flavors",  href: "/products?category=classic-flavors" },
    { label: "Spicy Collection", href: "/products?category=spicy-collection" },
    { label: "Premium Range",    href: "/products?category=premium-range" },
  ],
  Company: [
    { label: "About Us",   href: "/about" },
    { label: "Blog",       href: "/blog" },
    { label: "Contact Us", href: "/contact" },
    { label: "Careers",    href: "/careers" },
  ],
  Support: [
    { label: "FAQ",              href: "/faq" },
    { label: "Shipping Policy",  href: "/shipping" },
    { label: "Return Policy",    href: "/returns" },
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
  ],
}

const TRUST_ITEMS = [
  { icon: Truck,        title: "Free Shipping",    desc: "On orders above ₹499" },
  { icon: RefreshCw,    title: "Easy Returns",     desc: "7-day hassle-free returns" },
  { icon: Shield,       title: "Secure Payments",  desc: "100% safe & encrypted" },
  { icon: Headphones,   title: "24/7 Support",     desc: "We're always here to help" },
]

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  Instagram,
  Facebook,
  Twitter,
  YouTube: Youtube,
  LinkedIn: Linkedin,
}

const PAYMENT_METHODS = ["Visa", "Mastercard", "UPI", "Razorpay", "NetBanking"]

export default async function Footer() {
  const s = await getSiteSettings()

  const socialLinks = [
    { label: "Instagram", href: s.instagram },
    { label: "Facebook",  href: s.facebook  },
    { label: "Twitter",   href: s.twitter   },
    { label: "YouTube",   href: s.youtube   },
    { label: "LinkedIn",  href: s.linkedin  },
  ].filter((l) => l.href)

  const copyright =
    s.copyrightText ||
    `© ${new Date().getFullYear()} ${s.companyName}. All rights reserved.`

  return (
    <footer className="border-t border-border/40 bg-card mt-20">

      {/* Trust bar */}
      <div className="border-b border-border/30">
        <div className="container py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">

          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-4">
              <span className="text-brand-500">🌾</span>
              <span>{s.companyName}</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {s.footerText || "Premium makhana snacks crafted with care. Zero guilt, maximum crunch."}
            </p>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mt-5">
                {socialLinks.map((link) => {
                  const Icon = SOCIAL_ICONS[link.label] ?? Instagram
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                      aria-label={link.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Bottom bar */}
      <div className="container py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">{copyright}</p>

          {/* Payment methods */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="px-2 py-1 rounded border border-border/60 text-[10px] font-medium text-muted-foreground"
              >
                {method}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Made with</span>
            <span className="text-brand-500">♥</span>
            <span>in India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
