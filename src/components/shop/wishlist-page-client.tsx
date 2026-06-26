"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShoppingCart, Trash2 } from "lucide-react"

interface WishlistVariant {
  id: string
  weight: string
  price: number
  stock: number
  isActive: boolean
}

interface WishlistItem {
  id: string
  productId: string
  variantId: string | null
  product: { id: string; name: string; slug: string; images: string[]; status: string; variants: WishlistVariant[] }
  collection: { id: string; name: string } | null
}

interface Collection {
  id: string
  name: string
}

interface Props {
  items: WishlistItem[]
  collections: Collection[]
}

export default function WishlistPageClient({ items: initialItems, collections }: Props) {
  const router = useRouter()
  const [items, setItems]   = useState(initialItems)
  const [loading, setLoading] = useState<string | null>(null)

  async function removeItem(wishlistId: string) {
    setLoading(wishlistId)
    await fetch(`/api/wishlist?id=${wishlistId}`, { method: "DELETE" })
    setItems((prev) => prev.filter((i) => i.id !== wishlistId))
    setLoading(null)
  }

  async function moveToCart(item: WishlistItem) {
    if (!item.variantId) return
    setLoading(item.id)
    const res = await fetch("/api/wishlist/move-to-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wishlistId: item.id }),
    })
    if (res.ok) router.refresh()
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const variant = item.product.variants[0] ?? null
        const inStock = variant?.isActive && (variant?.stock ?? 0) > 0
        return (
          <div key={item.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-4">
            <Link href={`/products/${item.product.slug}`}>
              <img
                src={item.product.images[0] ?? "/placeholder.png"}
                alt={item.product.name}
                className="h-16 w-16 object-cover rounded-lg shrink-0"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/products/${item.product.slug}`} className="font-medium hover:underline line-clamp-1">
                {item.product.name}
              </Link>
              {variant && (
                <p className="text-sm text-muted-foreground">{variant.weight} — ₹{variant.price}</p>
              )}
              {item.collection && (
                <p className="text-xs text-brand-400 mt-0.5">{item.collection.name}</p>
              )}
              {!inStock && (
                <p className="text-xs text-red-500 mt-0.5">Out of stock</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => moveToCart(item)}
                disabled={!inStock || loading === item.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-40 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Add to Cart</span>
              </button>
              <button
                onClick={() => removeItem(item.id)}
                disabled={loading === item.id}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
