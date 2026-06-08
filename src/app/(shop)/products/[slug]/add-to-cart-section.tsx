"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice, getDiscountPercent } from "@/lib/utils"
import type { Product, ProductVariant } from "@/types"
import { cn } from "@/lib/utils"

interface Props {
  product: Product & { variants: ProductVariant[] }
}

export default function AddToCartSection({ product }: Props) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0]
  const discount = getDiscountPercent(selectedVariant.price, selectedVariant.mrp)
  const isOutOfStock = selectedVariant.stock === 0
  const isLowStock = !isOutOfStock && selectedVariant.stock <= selectedVariant.lowStockThreshold

  async function handleAddToCart() {
    if (isOutOfStock) return
    setLoading(true)
    try {
      await addItem(product.id, selectedVariant.id, quantity)
      toast({ title: "Added to cart!", description: `${quantity}× ${product.name} (${selectedVariant.weight})` })
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-brand-400">{formatPrice(selectedVariant.price)}</span>
        {selectedVariant.mrp > selectedVariant.price && (
          <>
            <span className="text-lg text-muted-foreground line-through">{formatPrice(selectedVariant.mrp)}</span>
            <Badge variant="destructive">{discount}% OFF</Badge>
          </>
        )}
      </div>

      {/* Stock status */}
      {isLowStock && (
        <p className="text-sm text-yellow-400">⚡ Only {selectedVariant.stock} left in stock</p>
      )}
      {isOutOfStock && (
        <p className="text-sm text-destructive">✗ Out of stock</p>
      )}

      {/* Variant selector */}
      <div>
        <p className="text-sm font-medium mb-2">Size / Weight</p>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVariantId(v.id)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                v.id === selectedVariantId
                  ? "border-brand-500 bg-brand-500/15 text-brand-400"
                  : "border-border hover:border-brand-500/40",
                !v.isActive || v.stock === 0 ? "opacity-50 cursor-not-allowed" : ""
              )}
              disabled={!v.isActive}
            >
              {v.weight}
              {v.stock === 0 && <span className="ml-1 text-xs text-muted-foreground">(OOS)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <p className="text-sm font-medium mb-2">Quantity</p>
        <div className="flex items-center border border-border rounded-lg w-fit">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 py-2 hover:bg-accent transition-colors rounded-l-lg"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-5 py-2 font-medium min-w-[3rem] text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
            className="px-4 py-2 hover:bg-accent transition-colors rounded-r-lg"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="brand"
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
          disabled={isOutOfStock || loading}
        >
          <ShoppingCart className="h-5 w-5" />
          {isOutOfStock ? "Out of Stock" : loading ? "Adding…" : "Add to Cart"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={async () => { await handleAddToCart(); window.location.href = "/checkout" }}
          disabled={isOutOfStock || loading}
        >
          <Zap className="h-5 w-5" />
          Buy Now
        </Button>
      </div>

      {/* Subscribe option */}
      {product.isSubscriptionEligible && (
        <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-4">
          <p className="text-sm font-medium text-brand-400">📦 Subscribe &amp; Save 10%</p>
          <p className="text-xs text-muted-foreground mt-1">Get {product.name} delivered on a schedule. Pause or cancel anytime.</p>
        </div>
      )}
    </div>
  )
}
