"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    if (!confirm("Cancel this order? This cannot be undone.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Order cancelled", description: "Your order has been cancelled and inventory restored." })
        router.push("/orders")
        router.refresh()
      } else {
        toast({ title: "Could not cancel", description: data.error ?? "Something went wrong.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleCancel} disabled={loading}>
      {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Cancelling…</> : "Cancel Order"}
    </Button>
  )
}
