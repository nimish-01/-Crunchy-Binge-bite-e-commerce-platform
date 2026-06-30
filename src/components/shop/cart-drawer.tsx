"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCart } from "@/contexts/cart-context"
import { formatPrice } from "@/lib/utils"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface CartDrawerProps {
  onClose: () => void
}

const FREE_DELIVERY_THRESHOLD = 499

export default function CartDrawer({ onClose }: CartDrawerProps) {
  const {
    items, subtotal, total, discountAmount, deliveryCharge,
    itemCount, coupon, removeItem, updateQuantity, applyCoupon, removeCoupon,
  } = useCart()
  const { status: sessionStatus } = useSession()
  const router = useRouter()

  function handleCheckout() {
    onClose()
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=%2Fcheckout")
    } else {
      router.push("/checkout")
    }
  }

  const [couponInput, setCouponInput]   = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError]   = useState("")
  const [couponOpen, setCouponOpen]     = useState(false)

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError("")
    const result = await applyCoupon(couponInput.trim().toUpperCase())
    setCouponLoading(false)
    if (!result.success) setCouponError(result.error ?? "Invalid coupon code")
    else { setCouponInput(""); setCouponOpen(false) }
  }

  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
  const freeDeliveryProgress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-border/40">
          <SheetTitle className="text-base">Cart</SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-base">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Pick a flavor and start snacking.
            </p>
          </div>
          <Button variant="brand" onClick={onClose} asChild>
            <Link href="/products" className="gap-2">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
        <SheetTitle className="text-base font-semibold">
          Cart
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </SheetTitle>
      </SheetHeader>

      {/* Free delivery progress */}
      {amountToFreeDelivery > 0 ? (
        <div className="px-5 py-3 bg-accent/40 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Add <span className="font-semibold text-foreground">{formatPrice(amountToFreeDelivery)}</span> for free delivery</span>
            <span className="text-muted-foreground">{Math.round(freeDeliveryProgress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden" role="progressbar" aria-valuenow={freeDeliveryProgress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${freeDeliveryProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="px-5 py-2.5 bg-green-500/8 border-b border-green-500/20 shrink-0">
          <p className="text-xs text-green-500 font-semibold text-center">
            🎉 You get free delivery!
          </p>
        </div>
      )}

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-border transition-colors"
          >
            {/* Image */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-accent/50 shrink-0">
              {item.product.images[0] ? (
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🌾</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight clamp-2">{item.product.name}</p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Remove ${item.product.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {item.variant.weight && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.variant.weight}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-bold text-brand-400">
                  {formatPrice(item.variant.price * item.quantity)}
                </p>
                {/* Quantity controls */}
                <div
                  className="flex items-center gap-1 border border-border/60 rounded-lg overflow-hidden"
                  role="group"
                  aria-label="Quantity"
                >
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-accent transition-colors"
                    aria-label="Decrease quantity"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold select-none" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-accent transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 pt-3 pb-4 border-t border-border/40 space-y-3 shrink-0 bg-card">

        {/* Coupon */}
        {coupon ? (
          <div className="flex items-center justify-between rounded-lg border border-green-500/25 bg-green-500/6 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-500">{coupon.code}</p>
                <p className="text-[11px] text-muted-foreground">{coupon.description}</p>
              </div>
            </div>
            <button
              onClick={removeCoupon}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove
            </button>
          </div>
        ) : couponOpen ? (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  className="pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className="h-9 px-4"
              >
                {couponLoading ? "…" : "Apply"}
              </Button>
            </div>
            {couponError && (
              <p className="text-xs text-destructive">{couponError}</p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setCouponOpen(true)}
            className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Tag className="h-3.5 w-3.5" />
            Have a coupon code?
          </button>
        )}

        <Separator className="opacity-50" />

        {/* Price breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="text-foreground">{formatPrice(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-500">
              <span>Discount</span>
              <span className="font-medium">− {formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery</span>
            <span className={deliveryCharge === 0 ? "text-green-500 font-medium" : "text-foreground"}>
              {deliveryCharge === 0 ? "FREE" : formatPrice(deliveryCharge)}
            </span>
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="text-brand-400">{formatPrice(total)}</span>
        </div>

        <Button variant="brand" className="w-full gap-2 font-semibold h-11" onClick={handleCheckout}>
          Checkout
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Secure checkout · Razorpay encrypted
        </p>
      </div>
    </div>
  )
}
