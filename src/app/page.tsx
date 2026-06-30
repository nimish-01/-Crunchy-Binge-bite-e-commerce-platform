import Link from "next/link"
import { ArrowRight, Zap, Shield, Leaf, Star, CheckCircle2, FlameKindling } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import ProductCard from "@/components/shop/product-card"
import HeroCarousel from "@/components/shop/hero-carousel"
import HomepageBanner from "@/components/promotions/homepage-banner"
import NewsletterForm from "@/components/shop/newsletter-form"
import { prisma } from "@/lib/prisma"
import { getHomepageCMS, getHomepageQuotes, getHeroSlides } from "@/lib/homepage"

const MEDIA_THUMB = {
  include: { mediaAsset: { select: { id: true, secureUrl: true, thumbnailUrl: true, resourceType: true, altText: true } } },
  orderBy: [{ isThumbnail: "desc" as const }, { sortOrder: "asc" as const }],
  take: 1,
}

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { isFeatured: true, status: "ACTIVE" },
    include: { variants: { where: { isActive: true } }, category: true, productMedia: MEDIA_THUMB },
    take: 4,
  })
}

async function getNewArrivals() {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { variants: { where: { isActive: true } }, category: true, productMedia: MEDIA_THUMB },
    orderBy: { createdAt: "desc" },
    take: 4,
  })
}

const WHY_ITEMS = [
  {
    icon: Leaf,
    title: "100% Natural",
    desc: "No artificial colors, flavors, or preservatives. Just pure lotus seeds and real ingredients.",
  },
  {
    icon: Zap,
    title: "High Protein",
    desc: "4–5g of plant protein per serving. A smarter snack that actually fuels you.",
  },
  {
    icon: Shield,
    title: "Hygienically Packed",
    desc: "Every batch is sealed in food-grade packaging to lock in crunch and freshness.",
  },
  {
    icon: FlameKindling,
    title: "Low Calorie",
    desc: "Under 120 calories per serving. Guilt-free snacking, any time of day.",
  },
]

const HEALTH_BENEFITS = [
  "Rich in antioxidants and anti-inflammatory properties",
  "Gluten-free and vegan-friendly",
  "Low GI — won't spike your blood sugar",
  "Good source of magnesium and potassium",
  "No cholesterol, no trans fats",
  "Certified by FSSAI for purity and safety",
]

const STATS = [
  { value: "2,400+", label: "Happy Customers" },
  { value: "4.9★",   label: "Average Rating" },
  { value: "12+",    label: "Unique Flavors" },
  { value: "100%",   label: "Natural Ingredients" },
]

export default async function HomePage() {
  const [cms, quotes, heroSlides, featured, newArrivals] = await Promise.all([
    getHomepageCMS(),
    getHomepageQuotes(),
    getHeroSlides(),
    getFeaturedProducts(),
    getNewArrivals(),
  ])

  return (
    <>
      <Header />
      <main>
        {/* ── Hero ───────────────────────────────────────────────── */}
        {cms.showHero && (
          heroSlides.length > 0 ? (
            <HeroCarousel slides={heroSlides} />
          ) : (
            <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-zinc-950">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_50%,rgba(245,158,11,0.06),transparent)]" />
              <div className="container relative z-10 py-24">
                <div className="max-w-xl">
                  {cms.heroBadge && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/8 px-3.5 py-1.5 text-xs font-semibold text-brand-400 mb-8 animate-fade-in">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                      {cms.heroBadge}
                    </div>
                  )}
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 animate-slide-up">
                    {cms.heroHeading}
                    {cms.heroSubheading && (
                      <>
                        {" "}
                        <span className="brand-gradient-text">{cms.heroSubheading}</span>
                      </>
                    )}
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed max-w-md animate-slide-up stagger-2">
                    {cms.heroDescription}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 animate-slide-up stagger-3">
                    <Button variant="brand" size="lg" asChild className="gap-2 font-semibold">
                      <Link href={cms.ctaLink}>
                        {cms.ctaText}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link href="/products">Browse All</Link>
                    </Button>
                  </div>

                  {/* Social proof */}
                  <div className="mt-10 flex items-center gap-5 animate-fade-in stagger-4">
                    <div className="flex -space-x-2.5" aria-label="Customer avatars">
                      {["P", "R", "A", "K"].map((l, i) => (
                        <div
                          key={i}
                          className="h-8 w-8 rounded-full bg-brand-500 border-2 border-background flex items-center justify-center text-xs font-bold text-zinc-950"
                          aria-hidden
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-1" aria-label="Rated 4.9 out of 5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
                        ))}
                        <span className="font-bold text-sm ml-0.5">4.9</span>
                      </div>
                      <p className="text-xs text-muted-foreground">from 2,400+ happy customers</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )
        )}

        {/* ── Promo banners ───────────────────────────────────────── */}
        <div className="container py-6">
          <HomepageBanner />
        </div>

        {/* ── Stats strip ─────────────────────────────────────────── */}
        <section className="border-y border-border/40 bg-card" aria-label="Brand stats">
          <div className="container py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold brand-gradient-text">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Choose Crunchy Bingebite ────────────────────────── */}
        {cms.showWhyChooseUs && (
          <section className="container section-gap">
            <div className="text-center max-w-2xl mx-auto mb-12">
              {cms.whyChooseTitle && (
                <Badge variant="outline" className="mb-4 text-brand-400 border-brand-500/30">
                  {cms.whyChooseTitle}
                </Badge>
              )}
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Snacking, done right.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Crunchy Bingebite makhana is roasted to perfection — light, airy, and packed with real flavor.
                No compromise on taste, no compromise on health.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {WHY_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="group p-6 rounded-xl border border-border/50 bg-card hover:border-brand-500/30 transition-all duration-250 hover:shadow-brand-sm"
                  >
                    <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                      <Icon className="h-5 w-5 text-brand-500" />
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Featured Products ───────────────────────────────────── */}
        {cms.showFeatured && featured.length > 0 && (
          <section className="container section-gap" aria-labelledby="featured-heading">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                {cms.featuredBadge && (
                  <Badge variant="outline" className="mb-3 text-brand-400 border-brand-500/30">
                    {cms.featuredBadge}
                  </Badge>
                )}
                <h2 id="featured-heading" className="text-3xl sm:text-4xl font-bold">
                  {cms.featuredTitle}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Our most loved flavors — tried, tested, and reordered.
                </p>
              </div>
              <Button variant="ghost" asChild className="self-start sm:self-auto shrink-0">
                <Link href="/products" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 2} />
              ))}
            </div>
          </section>
        )}

        {/* ── Health Benefits ─────────────────────────────────────── */}
        <section className="container section-gap">
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Text */}
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <Badge variant="outline" className="mb-4 text-brand-400 border-brand-500/30 self-start">
                  Why Makhana?
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                  Ancient superfood.<br />Modern snack.
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  Makhana (Fox Nuts) have been revered in Ayurveda for centuries.
                  We've taken this heritage ingredient and turned it into the most addictive,
                  guilt-free snack you'll ever try.
                </p>
                <ul className="space-y-3" aria-label="Health benefits">
                  {HEALTH_BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div className="relative bg-gradient-to-br from-brand-500/8 via-brand-500/4 to-transparent flex items-center justify-center p-12 min-h-[300px]">
                <div className="text-center">
                  <div className="text-8xl mb-4 animate-bounce-subtle">🌾</div>
                  <p className="text-sm font-semibold text-brand-400">Fox Nut Makhana</p>
                  <p className="text-xs text-muted-foreground mt-1">Harvested from the wetlands of Bihar</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Subscription / Offer Banner ─────────────────────────── */}
        {cms.showSubscription && cms.subscriptionTitle && (
          <section className="container pb-8">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-border/40 p-8 md:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12),transparent_60%)]" />
              <div className="relative z-10 max-w-lg">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">{cms.subscriptionTitle}</h2>
                {cms.subscriptionSubtext && (
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    {cms.subscriptionSubtext}
                  </p>
                )}
                {cms.subscriptionCtaText && (
                  <Button variant="brand" size="lg" asChild>
                    <Link href={cms.subscriptionCtaLink || "/products"}>
                      {cms.subscriptionCtaText}
                    </Link>
                  </Button>
                )}
              </div>
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[120px] opacity-8 hidden md:block select-none" aria-hidden>
                🌾
              </div>
            </div>
          </section>
        )}

        {/* ── New Arrivals ────────────────────────────────────────── */}
        {cms.showTrending && newArrivals.length > 0 && (
          <section className="container section-gap" aria-labelledby="new-arrivals-heading">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                {cms.trendingBadge && (
                  <Badge variant="outline" className="mb-3 text-brand-400 border-brand-500/30">
                    {cms.trendingBadge}
                  </Badge>
                )}
                <h2 id="new-arrivals-heading" className="text-3xl sm:text-4xl font-bold">
                  {cms.trendingTitle}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Fresh batches, bold new flavors. Be the first to try.
                </p>
              </div>
              <Button variant="ghost" asChild className="self-start sm:self-auto shrink-0">
                <Link href="/products" className="gap-2">
                  See All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* ── Customer Reviews ────────────────────────────────────── */}
        {cms.showReviews && quotes.length > 0 && (
          <section className="container section-gap" aria-labelledby="reviews-heading">
            <div className="text-center max-w-2xl mx-auto mb-12">
              {cms.reviewsBadge && (
                <Badge variant="outline" className="mb-4 text-brand-400 border-brand-500/30">
                  {cms.reviewsBadge}
                </Badge>
              )}
              <h2 id="reviews-heading" className="text-3xl sm:text-4xl font-bold">
                {cms.reviewsTitle}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm">
                Don't just take our word for it — hear from our customers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {quotes.map((q) => (
                <blockquote
                  key={q.id}
                  className="flex flex-col rounded-xl border border-border/50 bg-card p-6 hover:border-border transition-colors"
                >
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-4" aria-label={`${q.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= q.rating
                            ? "fill-brand-500 text-brand-500"
                            : "fill-muted text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-sm leading-relaxed text-muted-foreground flex-1">
                    &ldquo;{q.text}&rdquo;
                  </p>

                  {/* Author */}
                  <footer className="mt-4 pt-4 border-t border-border/40">
                    <p className="font-semibold text-sm">{q.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.city}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* ── Newsletter CTA ───────────────────────────────────────── */}
        <section className="container pb-16">
          <div className="rounded-2xl border border-border/50 bg-card p-8 md:p-12 text-center">
            <div className="max-w-lg mx-auto">
              <div className="text-4xl mb-4" aria-hidden>✉️</div>
              <h2 className="text-2xl font-bold mb-3">Stay in the loop</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Get notified about new flavors, exclusive offers, and health tips.
                No spam — just the good stuff.
              </p>
              <NewsletterForm />
              <p className="text-xs text-muted-foreground mt-4">
                Unsubscribe anytime. We respect your inbox.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
