"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props { orderId: string }

export function MarkAsPaidButton({ orderId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMarkPaid() {
    if (!confirm("Mark this COD order as paid? This action is logged and cannot be undone.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, { method: "POST" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed")
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleMarkPaid} disabled={loading} className="border-green-500/50 text-green-400 hover:bg-green-500/10">
      {loading
        ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processing…</>
        : <><CheckCircle className="h-4 w-4 mr-1.5" />Mark as Paid</>
      }
    </Button>
  )
}
