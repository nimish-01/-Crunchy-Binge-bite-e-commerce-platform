"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCart } from "@/contexts/cart-context"
import { formatPrice } from "@/lib/utils"
import { useState } from "react"

interface CartDrawerProps {
  onClose: () => void
}

export default function CartDrawer({ onClose }: CartDrawerProps) {
  const { items, subtotal, total, discountAmount, deliveryCharge, itemCount, coupon, removeItem, updateQuantity, applyCoupon, removeCoupon } = useCart()
  const [couponInput, setCouponInput] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError("")
    const result = await applyCoupon(couponInput.trim().toUpperCase())
    setCouponLoading(false)
    if (!result.success) setCouponError(result.error ?? "Invalid coupon")
    else setCouponInput("")
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SheetHeader className="p-6 border-b border-border/40">
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
          <div>
            <p className="font-medium text-lg">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Add some delicious makhana to get started!</p>
          </div>
          <Button variant="brand" onClick={onClose} asChild>
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-6 border-b border-border/40">
        <SheetTitle>Cart ({itemCount} {itemCount === 1 ? "item" : "items"})</SheetTitle>
      </SheetHeader>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              {item.product.images[0] ? (
                <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🌾</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
              <p className="text-xs text-muted-foreground">{item.variant.weight}</p>
              <p className="font-semibold text-brand-400 mt-1">{formatPrice(item.variant.price)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="flex items-center border border-border rounded-md">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 hover:bg-accent">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-2 text-sm font-medium min-w-[1.5rem] text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 hover:bg-accent">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/40 space-y-4">
        {/* Coupon */}
        {!coupon ? (
          <div className="space-y-1">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter coupon code"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError("") }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={couponLoading}>
                {couponLoading ? "…" : "Apply"}
              </Button>
            </div>
            {couponError && <p className="text-xs text-destructive">{couponError}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-brand-500/10 border border-brand-500/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-400" />
              <div>
                <p className="text-sm font-medium text-brand-400">{coupon.code}</p>
                <p className="text-xs text-muted-foreground">{coupon.description}</p>
              </div>
            </div>
            <button onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
          </div>
        )}

        {/* Free delivery progress */}
        {deliveryCharge > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Add <span className="text-brand-400 font-medium">{formatPrice(499 - subtotal)}</span> more for free delivery
          </div>
        )}

        <Separator />

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Discount</span>
              <span>− {formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>{deliveryCharge > 0 ? formatPrice(deliveryCharge) : <Badge variant="success">FREE</Badge>}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-brand-400">{formatPrice(total)}</span>
          </div>
        </div>

        <Button variant="brand" className="w-full" size="lg" onClick={onClose} asChild>
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  )
}
