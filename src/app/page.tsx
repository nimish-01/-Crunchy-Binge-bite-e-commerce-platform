import Link from "next/link"
import { ArrowRight, Zap, Shield, Leaf, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import ProductCard from "@/components/shop/product-card"
import { prisma } from "@/lib/prisma"
import { getHomepageCMS, getHomepageQuotes } from "@/lib/homepage"

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
  { icon: Leaf,   title: "100% Natural",        desc: "No artificial flavors or preservatives" },
  { icon: Zap,    title: "High Protein",         desc: "4-5g protein per serving" },
  { icon: Shield, title: "Hygienically Packed",  desc: "Sealed for maximum freshness" },
]

export default async function HomePage() {
  const [cms, quotes, featured, newArrivals] = await Promise.all([
    getHomepageCMS(),
    getHomepageQuotes(),
    getFeaturedProducts(),
    getNewArrivals(),
  ])

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        {cms.showHero && (
          <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.08),_transparent_60%)]" />
            <div className="container relative z-10 py-20">
              <div className="max-w-2xl">
                {cms.heroBadge && (
                  <Badge variant="brand" className="mb-6 text-sm px-4 py-1.5">
                    {cms.heroBadge}
                  </Badge>
                )}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
                  {cms.heroHeading}{cms.heroSubheading ? " " : ""}
                  {cms.heroSubheading && (
                    <span className="text-transparent bg-clip-text brand-gradient">
                      {cms.heroSubheading}
                    </span>
                  )}
                </h1>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                  {cms.heroDescription}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button variant="brand" size="xl" asChild>
                    <Link href={cms.ctaLink}>
                      {cms.ctaText} <ArrowRight className="h-5 w-5" />
                    </Link>
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
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-brand-500 text-brand-500" />)}
                      <span className="font-bold ml-1">4.9</span>
                    </div>
                    <p className="text-xs text-muted-foreground">from 2,400+ happy customers</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 hidden xl:flex items-center justify-center">
              <div className="text-[180px] animate-pulse">🌾</div>
            </div>
          </section>
        )}

        {/* Why Choose Us / USP Strip */}
        {cms.showWhyChooseUs && (
          <section className="border-y border-border/40 bg-card">
            <div className="container py-8">
              {cms.whyChooseTitle && (
                <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                  {cms.whyChooseTitle}
                </p>
              )}
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
        )}

        {/* Featured / Bestsellers */}
        {cms.showFeatured && featured.length > 0 && (
          <section className="container py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                {cms.featuredBadge && (
                  <Badge variant="outline" className="mb-2 text-brand-400 border-brand-500/30">
                    {cms.featuredBadge}
                  </Badge>
                )}
                <h2 className="text-3xl font-bold">{cms.featuredTitle}</h2>
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
        {cms.showSubscription && cms.subscriptionTitle && (
          <section className="container py-8">
            <div className="relative overflow-hidden rounded-2xl brand-gradient p-8 md:p-12">
              <div className="relative z-10 max-w-lg">
                <h2 className="text-3xl font-bold text-zinc-950 mb-3">{cms.subscriptionTitle}</h2>
                {cms.subscriptionSubtext && (
                  <p className="text-zinc-800 mb-6">{cms.subscriptionSubtext}</p>
                )}
                {cms.subscriptionCtaText && (
                  <Button className="bg-zinc-950 text-white hover:bg-zinc-800" size="lg" asChild>
                    <Link href={cms.subscriptionCtaLink || "/products"}>{cms.subscriptionCtaText}</Link>
                  </Button>
                )}
              </div>
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-20 hidden md:block">🌾</div>
            </div>
          </section>
        )}

        {/* Trending / New Arrivals */}
        {cms.showTrending && newArrivals.length > 0 && (
          <section className="container py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                {cms.trendingBadge && (
                  <Badge variant="outline" className="mb-2 text-brand-400 border-brand-500/30">
                    {cms.trendingBadge}
                  </Badge>
                )}
                <h2 className="text-3xl font-bold">{cms.trendingTitle}</h2>
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

        {/* Reviews / Quotes */}
        {cms.showReviews && quotes.length > 0 && (
          <section className="container py-16">
            <div className="text-center mb-12">
              {cms.reviewsBadge && (
                <Badge variant="outline" className="mb-2 text-brand-400 border-brand-500/30">
                  {cms.reviewsBadge}
                </Badge>
              )}
              <h2 className="text-3xl font-bold">{cms.reviewsTitle}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quotes.map((q) => (
                <div key={q.id} className="rounded-xl border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= q.rating ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">&quot;{q.text}&quot;</p>
                  <p className="font-medium text-sm">{q.name}</p>
                  <p className="text-xs text-muted-foreground">{q.city}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
