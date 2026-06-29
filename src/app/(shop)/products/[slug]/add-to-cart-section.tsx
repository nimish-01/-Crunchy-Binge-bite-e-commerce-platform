"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Minus, Plus, ShoppingCart, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { useToast } from "@/components/ui/use-toast"
import { cn, formatPrice, getDiscountPercent } from "@/lib/utils"
import type { Product, ProductVariant } from "@/types"

interface Props {
  product: Product & { variants: ProductVariant[] }
}

export default function AddToCartSection({ product }: Props) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id)
  const [quantity, setQuantity] = useState(1)
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null)
  const [added, setAdded] = useState(false)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0]
  const discount = getDiscountPercent(selectedVariant.price, selectedVariant.mrp)
  const isOutOfStock = selectedVariant.stock === 0
  const isLowStock = !isOutOfStock && selectedVariant.stock <= selectedVariant.lowStockThreshold
  const isSubmitting = pendingAction !== null
  const maxQuantity = useMemo(() => Math.min(selectedVariant.stock, 99), [selectedVariant.stock])

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(maxQuantity, 1))))
  }, [maxQuantity, selectedVariantId])

  async function handleAddToCart(action: "cart" | "buy" = "cart") {
    if (isOutOfStock || isSubmitting) return
    setPendingAction(action)
    try {
      await addItem(product.id, selectedVariant.id, quantity)
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1600)
      toast({
        title: "Added to cart",
        description: `${quantity} x ${product.name} (${selectedVariant.weight})`,
      })
      if (action === "buy") router.push("/checkout")
    } catch (error) {
      toast({
        title: "Failed to add to cart",
        description: error instanceof Error ? error.message : "Please check stock and try again.",
        variant: "destructive",
      })
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-brand-400">{formatPrice(selectedVariant.price)}</span>
        {selectedVariant.mrp > selectedVariant.price && (
          <>
            <span className="text-lg text-muted-foreground line-through">{formatPrice(selectedVariant.mrp)}</span>
            <Badge variant="destructive">{discount}% OFF</Badge>
          </>
        )}
      </div>

      {isLowStock && (
        <p className="text-sm text-yellow-400">Only {selectedVariant.stock} left in stock</p>
      )}
      {isOutOfStock && (
        <p className="text-sm text-destructive">Out of stock</p>
      )}

      <div>
        <p className="text-sm font-medium mb-2">Size / Weight</p>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((variant) => {
            const unavailable = !variant.isActive || variant.stock === 0
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                className={cn(
                  "min-h-11 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  variant.id === selectedVariantId
                    ? "border-brand-500 bg-brand-500/15 text-brand-400"
                    : "border-border hover:border-brand-500/40",
                  unavailable ? "opacity-50 cursor-not-allowed" : ""
                )}
                disabled={unavailable || isSubmitting}
                aria-pressed={variant.id === selectedVariantId}
              >
                {variant.weight}
                {variant.stock === 0 && <span className="ml-1 text-xs text-muted-foreground">(OOS)</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Quantity</p>
        <div className="flex items-center border border-border rounded-lg w-fit overflow-hidden">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="min-h-11 min-w-11 px-3 hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="Decrease quantity"
            disabled={quantity <= 1 || isSubmitting}
          >
            <Minus className="h-4 w-4 mx-auto" />
          </button>
          <span className="px-5 py-2 font-medium min-w-[3rem] text-center" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            className="min-h-11 min-w-11 px-3 hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="Increase quantity"
            disabled={quantity >= maxQuantity || isSubmitting}
          >
            <Plus className="h-4 w-4 mx-auto" />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="brand"
          size="lg"
          className="flex-1 min-h-12"
          onClick={() => handleAddToCart("cart")}
          disabled={isOutOfStock || isSubmitting}
        >
          {pendingAction === "cart" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : added ? (
            <Check className="h-5 w-5" />
          ) : (
            <ShoppingCart className="h-5 w-5" />
          )}
          {isOutOfStock ? "Out of Stock" : pendingAction === "cart" ? "Adding..." : added ? "Added" : "Add to Cart"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1 min-h-12"
          onClick={() => handleAddToCart("buy")}
          disabled={isOutOfStock || isSubmitting}
        >
          {pendingAction === "buy" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
          {pendingAction === "buy" ? "Opening checkout..." : "Buy Now"}
        </Button>
      </div>

      {product.isSubscriptionEligible && (
        <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-4">
          <p className="text-sm font-medium text-brand-400">Subscribe &amp; Save 10%</p>
          <p className="text-xs text-muted-foreground mt-1">
            Get {product.name} delivered on a schedule. Pause or cancel anytime.
          </p>
        </div>
      )}
    </div>
  )
}
