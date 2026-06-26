"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface Props {
  orderId: string
  currentStatus: string
}

export function PackingActions({ orderId, currentStatus }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: string) {
    setLoading(status)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Status updated" })
        router.refresh()
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      {currentStatus === "CONFIRMED" && (
        <Button
          variant="outline"
          size="sm"
          disabled={!!loading}
          onClick={() => updateStatus("PACKING")}
        >
          {loading === "PACKING" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Start Packing
        </Button>
      )}
      {(currentStatus === "PACKING" || currentStatus === "CONFIRMED") && (
        <Button
          variant="brand"
          size="sm"
          disabled={!!loading}
          onClick={() => updateStatus("READY_TO_SHIP")}
        >
          {loading === "READY_TO_SHIP" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Ready to Ship
        </Button>
      )}
      {currentStatus === "PACKED" && (
        <Button
          variant="brand"
          size="sm"
          disabled={!!loading}
          onClick={() => updateStatus("READY_TO_SHIP")}
        >
          {loading === "READY_TO_SHIP" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Mark Ready
        </Button>
      )}
    </div>
  )
}
