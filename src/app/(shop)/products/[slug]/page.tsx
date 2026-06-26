import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Leaf, Zap, RotateCcw, ShieldX, Star, CheckCircle2, Truck, Shield } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPrice, getDiscountPercent } from "@/lib/utils"
import AddToCartSection from "./add-to-cart-section"
import ProductGallery from "@/components/shop/product-gallery"
import type { GalleryItem } from "@/components/shop/product-gallery"
import ReviewSection from "@/components/shop/review-section"

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await prisma.product.findUnique({ where: { slug } })
  if (!product) return {}
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDesc ?? product.shortDescription,
  }
}

const TRUST_BADGES = [
  { icon: Truck,         text: "Free delivery above ₹499" },
  { icon: RotateCcw,     text: "Easy 7-day returns" },
  { icon: Shield,        text: "Secure checkout" },
  { icon: CheckCircle2,  text: "FSSAI certified" },
]

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug, status: "ACTIVE" },
    include: {
      variants: { where: { isActive: true }, orderBy: { price: "asc" } },
      category: true,
      productMedia: {
        include: { mediaAsset: true },
        orderBy: [{ isThumbnail: "desc" }, { sortOrder: "asc" }],
      },
    },
  })

  if (!product || product.variants.length === 0) notFound()

  const galleryItems: GalleryItem[] =
    product.productMedia.length > 0
      ? product.productMedia.map((pm) => ({
          id: pm.id,
          type: pm.mediaAsset.resourceType === "video" ? "video" : "image",
          url: pm.mediaAsset.secureUrl,
          thumb: pm.mediaAsset.thumbnailUrl ?? pm.mediaAsset.secureUrl,
          alt: pm.mediaAsset.altText ?? product.name,
        }))
      : product.images.map((url, i) => ({
          id: `legacy-${i}`,
          type: "image" as const,
          url,
          thumb: url,
          alt: product.name,
        }))

  const defaultVariant = product.variants[0]
  const discount = getDiscountPercent(defaultVariant.price, defaultVariant.mrp)

  return (
    <div className="container py-8 sm:py-12">

      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span className="text-foreground font-medium truncate max-w-[160px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-16">

        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery
            items={galleryItems}
            productName={product.name}
            isFeatured={product.isFeatured}
          />
        </div>

        {/* Product info */}
        <div className="space-y-6">

          {/* Category + Badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Link
                href={`/products?category=${product.category.slug}`}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 uppercase tracking-wide transition-colors"
              >
                {product.category.name}
              </Link>
              {product.isFeatured && (
                <Badge className="text-[10px] bg-brand-500 text-zinc-950 border-0 font-semibold">
                  Bestseller
                </Badge>
              )}
              {discount > 0 && (
                <Badge className="text-[10px] bg-green-500 text-white border-0 font-semibold">
                  {discount}% OFF
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{product.name}</h1>

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                {product.shortDescription}
              </p>
            )}
          </div>

          {/* Rating (placeholder) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5" aria-label="Rated 4 out of 5 stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s <= 4 ? "fill-brand-400 text-brand-400" : "fill-muted text-muted"}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">4.0 · 12 reviews</span>
          </div>

          {/* Dietary tags */}
          {product.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Dietary information">
              {product.dietaryTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-brand-500/25 text-brand-400 bg-brand-500/8"
                >
                  <Leaf className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Add to cart — client component */}
          <AddToCartSection product={product} />

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2">
            {TRUST_BADGES.map((badge) => {
              const Icon = badge.icon
              return (
                <div
                  key={badge.text}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2.5"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground leading-tight">{badge.text}</span>
                </div>
              )
            })}
          </div>

          <Separator />

          {/* Description */}
          {product.description && (
            <div>
              <h2 className="text-sm font-semibold mb-3">About This Product</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Nutritional Info */}
          {product.nutritionalInfo && (
            <div>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-400" />
                Nutritional Info
                <span className="text-xs text-muted-foreground font-normal">per 30g serving</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Object.entries(product.nutritionalInfo as Record<string, string>).map(([key, val]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-border/50 bg-card p-3 text-center"
                  >
                    <p className="text-base font-bold text-brand-400">{val}</p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{key}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allergen info */}
          {product.allergenInfo && (
            <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
              <span className="font-medium text-foreground">Allergens: </span>
              {product.allergenInfo}
            </p>
          )}

          {/* Return policy */}
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${
              product.returnWindowDays > 0
                ? "border-green-500/25 bg-green-500/5 text-green-400"
                : "border-border/50 bg-muted/30 text-muted-foreground"
            }`}
          >
            {product.returnWindowDays > 0 ? (
              <>
                <RotateCcw className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{product.returnWindowDays}-Day Return Policy</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    Not satisfied? Return within {product.returnWindowDays} days of delivery.
                  </p>
                </div>
              </>
            ) : (
              <>
                <ShieldX className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Non-returnable</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    This product is not eligible for returns due to hygiene reasons.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16">
        <ReviewSection productId={product.id} productSlug={product.slug} />
      </div>
    </div>
  )
}
