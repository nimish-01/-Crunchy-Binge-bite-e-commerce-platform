"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { formatPrice, getDiscountPercent } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import type { ProductWithVariants } from "@/types"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  product: ProductWithVariants
  className?: string
  priority?: boolean
}

export default function ProductCard({ product, className, priority = false }: ProductCardProps) {
  const { addItem, isLoading } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const { status: sessionStatus } = useSession()
  const [adding, setAdding] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  const defaultVariant = product.variants.find((v) => v.isActive) ?? product.variants[0]
  if (!defaultVariant) return null

  const discount = getDiscountPercent(defaultVariant.price, defaultVariant.mrp)
  const isOutOfStock = defaultVariant.stock === 0

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock || adding) return
    if (sessionStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
      return
    }
    setAdding(true)
    try {
      await addItem(product.id, defaultVariant.id)
      toast({ title: "Added to cart", description: product.name })
    } catch {
      toast({ title: "Could not add to cart", variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setWishlisted((v) => !v)
  }

  const thumb = product.productMedia?.[0]?.mediaAsset?.secureUrl ?? product.images[0]

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl", className)}
      aria-label={`${product.name}, ${formatPrice(defaultVariant.price)}`}
    >
      <article className={cn(
        "relative rounded-xl border bg-card overflow-hidden",
        "transition-all duration-250",
        "border-border/50 hover:border-border",
        "hover:shadow-elevation-2",
        isOutOfStock && "opacity-80"
      )}>

        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-accent/30">
          {thumb ? (
            <Image
              src={thumb}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              🌾
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5" aria-label="Product labels">
            {product.isFeatured && !isOutOfStock && (
              <Badge className="text-[10px] px-2 py-0.5 bg-brand-500 text-zinc-950 font-semibold border-0">
                Bestseller
              </Badge>
            )}
            {discount > 0 && !isOutOfStock && (
              <Badge className="text-[10px] px-2 py-0.5 bg-green-500 text-white font-semibold border-0">
                {discount}% OFF
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                Sold Out
              </Badge>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wishlisted}
            className={cn(
              "absolute top-2.5 right-2.5 h-8 w-8 rounded-full flex items-center justify-center",
              "bg-background/85 backdrop-blur-sm border border-border/40",
              "transition-all duration-200",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              wishlisted
                ? "text-red-500 border-red-500/30 bg-red-50/10"
                : "text-muted-foreground hover:text-red-400"
            )}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={wishlisted ? "currentColor" : "none"}
            />
          </button>

          {/* Add to cart — slides up on hover */}
          {!isOutOfStock && (
            <div className={cn(
              "absolute bottom-0 inset-x-0 p-2",
              "translate-y-full group-hover:translate-y-0",
              "transition-transform duration-250 ease-out"
            )}>
              <Button
                variant="brand"
                className="w-full h-9 text-sm gap-2 shadow-brand-md"
                onClick={handleAddToCart}
                disabled={adding || isLoading}
                tabIndex={-1}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {adding ? "Adding…" : "Add to Cart"}
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 pt-2.5">
          {/* Category */}
          {product.category && (
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wide font-medium mb-1 truncate">
              {product.category.name}
            </p>
          )}

          {/* Name */}
          <h3 className="text-sm font-medium leading-snug clamp-2 mb-2">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-2.5" aria-label="Rating: 4 out of 5 stars">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3 w-3",
                    s <= 4
                      ? "fill-brand-400 text-brand-400"
                      : "fill-muted text-muted"
                  )}
                />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">(12)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold">
              {formatPrice(defaultVariant.price)}
            </span>
            {defaultVariant.mrp > defaultVariant.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(defaultVariant.mrp)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-[11px] font-semibold text-green-500 ml-auto">
                Save {formatPrice(defaultVariant.mrp - defaultVariant.price)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}

/* ─── Skeleton ─────────────────────────────────────────────── */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card overflow-hidden", className)}>
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-16 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-3.5 w-3/4 skeleton rounded" />
        <div className="h-4 w-20 skeleton rounded mt-1" />
      </div>
    </div>
  )
}
