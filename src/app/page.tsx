import Link from "next/link"
import { ArrowRight, Zap, Shield, Leaf, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import ProductCard from "@/components/shop/product-card"
import { prisma } from "@/lib/prisma"

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { isFeatured: true, status: "ACTIVE" },
    include: { variants: { where: { isActive: true } }, category: true },
    take: 4,
  })
}

async function getNewArrivals() {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { variants: { where: { isActive: true } }, category: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  })
}

const USP_ITEMS = [
  { icon: Leaf, title: "100% Natural", desc: "No artificial flavors or preservatives" },
  { icon: Zap, title: "High Protein", desc: "4-5g protein per serving" },
  { icon: Shield, title: "Hygienically Packed", desc: "Sealed for maximum freshness" },
]

const TESTIMONIALS = [
  { name: "Priya S.", city: "Bengaluru", rating: 5, text: "Best makhana I've ever had. The Peri Peri flavor is absolutely addictive!" },
  { name: "Rohit M.", city: "Mumbai", rating: 5, text: "Finally a healthy snack that doesn't compromise on taste. My whole family loves it." },
  { name: "Ananya I.", city: "Chennai", rating: 5, text: "The packaging is premium, the taste is incredible. Subscribed monthly!" },
]

export default async function HomePage() {
  const [featured, newArrivals] = await Promise.all([getFeaturedProducts(), getNewArrivals()])

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.08),_transparent_60%)]" />
          <div className="container relative z-10 py-20">
            <div className="max-w-2xl">
              <Badge variant="brand" className="mb-6 text-sm px-4 py-1.5">
                🌾 Premium Makhana — Roasted Fresh
              </Badge>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
                Snack Bold.{" "}
                <span className="text-transparent bg-clip-text brand-gradient">
                  Stay Fit.
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                Premium flavored makhana for the modern snacker. Zero guilt, maximum crunch, delivered to your door across India.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="brand" size="xl" asChild>
                  <Link href="/products">
                    Shop Now <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link href="/products?category=premium-range">View Premium Range</Link>
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {["P", "R", "A", "K"].map((l, i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-brand-500 border-2 border-background flex items-center justify-center text-xs font-bold text-zinc-950">
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => <Star key={s} className="h-4 w-4 fill-brand-500 text-brand-500" />)}
                    <span className="font-bold ml-1">4.9</span>
                  </div>
                  <p className="text-xs text-muted-foreground">from 2,400+ happy customers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating product visual */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 hidden xl:flex items-center justify-center">
            <div className="text-[180px] animate-pulse">🌾</div>
          </div>
        </section>

        {/* USP Strip */}
        <section className="border-y border-border/40 bg-card">
          <div className="container py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {USP_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Best Sellers */}
        {featured.length > 0 && (
          <section className="container py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <Badge variant="outline" className="mb-2 text-brand-400 border-brand-500/30">Bestsellers</Badge>
                <h2 className="text-3xl font-bold">Customer Favorites</h2>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/products" className="gap-2">View All <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Subscription Banner */}
        <section className="container py-8">
          <div className="relative overflow-hidden rounded-2xl brand-gradient p-8 md:p-12">
            <div className="relative z-10 max-w-lg">
              <h2 className="text-3xl font-bold text-zinc-950 mb-3">Never Run Out Again</h2>
              <p className="text-zinc-800 mb-6">Subscribe & save up to 15%. Pause, skip, or cancel anytime. No strings attached.</p>
              <Button className="bg-zinc-950 text-white hover:bg-zinc-800" size="lg" asChild>
                <Link href="/products">Start Your Subscription</Link>
              </Button>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-20 hidden md:block">🌾</div>
          </div>
        </section>

        {/* New Arrivals */}
        {newArrivals.length > 0 && (
          <section className="container py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <Badge variant="outline" className="mb-2 text-brand-400 border-brand-500/30">Just In</Badge>
                <h2 className="text-3xl font-bold">New Arrivals</h2>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/products" className="gap-2">See All <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <Separator />

        {/* Testimonials */}
        <section className="container py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-2 text-brand-400 border-brand-500/30">Reviews</Badge>
            <h2 className="text-3xl font-bold">What Customers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= t.rating ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">&quot;{t.text}&quot;</p>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.city}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
