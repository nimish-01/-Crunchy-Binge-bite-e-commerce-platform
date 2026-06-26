"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { useSession } from "next-auth/react"

interface Props {
  productId: string
  variantId?: string
  className?: string
}

export default function WishlistButton({ productId, variantId, className = "" }: Props) {
  const { data: session } = useSession()
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistId, setWishlistId] = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/wishlist?productId=${productId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.items?.length) {
          setWishlisted(true)
          setWishlistId(d.items[0].id)
        }
      })
      .catch(() => null)
  }, [session?.user?.id, productId])

  async function toggle() {
    if (!session?.user?.id) {
      window.location.href = "/login"
      return
    }
    setLoading(true)
    if (wishlisted && wishlistId) {
      await fetch(`/api/wishlist?id=${wishlistId}`, { method: "DELETE" })
      setWishlisted(false)
      setWishlistId(null)
    } else {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId }),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setWishlisted(true)
        setWishlistId(data.item.id)
      }
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`p-2 rounded-full transition-colors ${
        wishlisted
          ? "text-red-500 hover:text-red-600"
          : "text-muted-foreground hover:text-red-400"
      } ${className}`}
    >
      <Heart className={`h-5 w-5 ${wishlisted ? "fill-current" : ""}`} />
    </button>
  )
}
