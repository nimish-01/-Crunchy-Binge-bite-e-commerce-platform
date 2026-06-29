"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { useToast } from "@/components/ui/use-toast"

interface OrderItem {
  productId: string
  variantId: string
  quantity: number
  productName: string
}

export function BuyAgainButton({ items }: { items: OrderItem[] }) {
  const { addItem } = useCart()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleBuyAgain() {
    setLoading(true)
    try {
      for (const item of items) {
        await addItem(item.productId, item.variantId, item.quantity)
      }
      toast({
        title: "Items added to cart",
        description: `${items.length} item(s) added. Ready to checkout.`,
      })
      router.push("/checkout")
    } catch {
      toast({
        title: "Some items unavailable",
        description: "One or more items could not be added (may be out of stock).",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleBuyAgain} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
      Buy Again
    </Button>
  )
}
