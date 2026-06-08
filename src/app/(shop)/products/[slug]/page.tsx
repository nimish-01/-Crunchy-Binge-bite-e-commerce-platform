import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Star, ChevronRight, Leaf, Zap, RotateCcw, ShieldX } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPrice, getDiscountPercent } from "@/lib/utils"
import AddToCartSection from "./add-to-cart-section"

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await prisma.product.findUnique({ where: { slug } })
  if (!product) return {}
  return { title: product.seoTitle ?? product.name, description: product.seoDesc ?? product.shortDescription }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug, status: "ACTIVE" },
    include: {
      variants: { where: { isActive: true }, orderBy: { price: "asc" } },
      category: true,
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!product || product.variants.length === 0) notFound()

  const avgRating = product.reviews.length
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : 0

  return (
    <div className="container py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/products" className="hover:text-foreground">Products</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-border/50">
            {product.images[0] ? (
              <Image src={product.images[0]} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">🌾</div>
            )}
            {product.isFeatured && (
              <div className="absolute top-4 left-4">
                <Badge variant="brand">Bestseller</Badge>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.slice(1).map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-border/50">
                  <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-brand-400 mb-2">{product.category.name}</p>
          <h1 className="text-3xl font-bold leading-tight mb-3">{product.name}</h1>

          {/* Rating */}
          {product.reviews.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                ))}
              </div>
              <span className="font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">({product.reviews.length} reviews)</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {product.dietaryTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-brand-400 border-brand-500/30">
                <Leaf className="h-3 w-3 mr-1" />{tag}
              </Badge>
            ))}
          </div>

          {/* Client-side: variant selection + add to cart */}
          <AddToCartSection product={product} />

          <Separator className="my-6" />

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">About This Product</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Nutritional Info */}
          {product.nutritionalInfo && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-brand-400" />Nutritional Info (per 30g serving)</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(product.nutritionalInfo as Record<string, string>).map(([key, val]) => (
                  <div key={key} className="rounded-lg bg-card border border-border/50 p-3 text-center">
                    <p className="text-lg font-bold text-brand-400">{val}</p>
                    <p className="text-xs text-muted-foreground capitalize">{key}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.allergenInfo && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Allergens: </span>{product.allergenInfo}
            </p>
          )}

          {/* Return Policy */}
          <div className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            product.returnWindowDays > 0
              ? "border-green-500/30 bg-green-500/5 text-green-400"
              : "border-border/50 bg-muted/30 text-muted-foreground"
          }`}>
            {product.returnWindowDays > 0 ? (
              <>
                <RotateCcw className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{product.returnWindowDays}-Day Return Policy</p>
                  <p className="text-xs opacity-80 mt-0.5">
                    Not satisfied? Request a return within {product.returnWindowDays} days of delivery.
                  </p>
                </div>
              </>
            ) : (
              <>
                <ShieldX className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">No Return Policy</p>
                  <p className="text-xs opacity-80 mt-0.5">This product is not eligible for returns.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border/50 bg-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{review.user.name ?? "Customer"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
