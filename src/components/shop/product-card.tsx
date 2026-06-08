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
import { cn } from "@/lib/utils"

interface ProductCardProps {
  product: ProductWithVariants
  className?: string
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { addItem, isLoading } = useCart()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)

  const defaultVariant = product.variants.find((v) => v.isActive) ?? product.variants[0]
  if (!defaultVariant) return null

  const discount = getDiscountPercent(defaultVariant.price, defaultVariant.mrp)
  const isOutOfStock = defaultVariant.stock === 0

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock || adding) return
    setAdding(true)
    try {
      await addItem(product.id, defaultVariant.id)
      toast({ title: "Added to cart!", description: product.name, variant: "default" })
    } catch {
      toast({ title: "Failed to add", variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  return (
    <Link href={`/products/${product.slug}`} className={cn("group block", className)}>
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card hover:border-brand-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5">
        {/* Image */}
        <div className="relative aspect-square bg-zinc-800 overflow-hidden">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🌾</div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isFeatured && <Badge variant="brand" className="text-xs">Bestseller</Badge>}
            {discount > 0 && <Badge variant="destructive" className="text-xs">{discount}% OFF</Badge>}
            {isOutOfStock && <Badge variant="secondary" className="text-xs">Out of Stock</Badge>}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
          >
            <Heart className="h-4 w-4" />
          </button>

          {/* Add to cart overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button
              variant="brand"
              className="w-full"
              size="sm"
              onClick={handleAddToCart}
              disabled={isOutOfStock || adding || isLoading}
            >
              <ShoppingCart className="h-4 w-4" />
              {isOutOfStock ? "Out of Stock" : adding ? "Adding…" : "Add to Cart"}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-1">{product.category?.name}</p>
          <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-2">{product.name}</h3>

          {/* Tags */}
          {product.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {product.dietaryTags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] text-brand-400 bg-brand-500/10 rounded-full px-2 py-0.5">{tag}</span>
              ))}
            </div>
          )}

          {/* Rating placeholder */}
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={cn("h-3 w-3", s <= 4 ? "fill-brand-500 text-brand-500" : "text-muted-foreground")} />
            ))}
            <span className="text-xs text-muted-foreground">(12)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-foreground">{formatPrice(defaultVariant.price)}</span>
            {defaultVariant.mrp > defaultVariant.price && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(defaultVariant.mrp)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
