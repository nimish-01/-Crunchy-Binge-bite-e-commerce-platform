import Link from "next/link"
import { Star } from "lucide-react"

const SOCIAL_PROOF = [
  { text: "\"Best makhana I've ever had. Genuinely addictive.\"", name: "Priya K.", city: "Mumbai" },
  { text: "\"The peri peri flavor is a total game changer.\"", name: "Rahul S.", city: "Bangalore" },
  { text: "\"My go-to snack for movie nights now.\"", name: "Anjali M.", city: "Delhi" },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08),transparent_60%)]" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg relative z-10">
          <span className="text-brand-500 text-2xl">🌾</span>
          <span>Binge Bite</span>
        </Link>

        {/* Center content */}
        <div className="relative z-10">
          <p className="text-4xl font-bold leading-tight mb-4">
            Premium makhana,<br />
            <span className="brand-gradient-text">zero guilt.</span>
          </p>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
            Roasted to perfection with real ingredients. No artificial flavors,
            no preservatives. Just pure, crunchy goodness.
          </p>
        </div>

        {/* Social proof */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className="h-4 w-4 fill-brand-500 text-brand-500" />
              ))}
            </div>
            <span className="text-sm font-semibold">4.9</span>
            <span className="text-sm text-muted-foreground">from 2,400+ customers</span>
          </div>
          {SOCIAL_PROOF.slice(0, 2).map((item) => (
            <blockquote
              key={item.name}
              className="rounded-xl border border-border/30 bg-white/3 px-4 py-3"
            >
              <p className="text-xs text-muted-foreground">{item.text}</p>
              <p className="text-xs font-semibold mt-1.5">{item.name} · {item.city}</p>
            </blockquote>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile logo */}
        <div className="lg:hidden p-5 border-b border-border/40">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-brand-500">🌾</span>
            Binge Bite
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
