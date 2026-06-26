"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { SHIPMENT_TRANSITIONS } from "@/lib/shipping/transitions"
import type { ShipmentStatus } from "@prisma/client"
import { ChevronDown, Loader2 } from "lucide-react"

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  CREATED:          "Created",
  PACKING:          "Packing",
  READY_TO_SHIP:    "Ready to Ship",
  SHIPPED:          "Shipped",
  IN_TRANSIT:       "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED:        "Delivered",
  DELIVERY_FAILED:  "Delivery Failed",
  RETURN_INITIATED: "Return Initiated",
  RETURN_PICKED:    "Return Picked",
  RETURNED:         "Returned",
  CANCELLED:        "Cancelled",
}

interface Props {
  shipment: {
    id: string
    status: ShipmentStatus
    trackingNumber?: string | null
    courierId?: string | null
  }
}

export function ShipmentActions({ shipment }: Props) {
  const router  = useRouter()
  const { toast } = useToast()
  const [loading, setLoading]       = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [description, setDescription]  = useState("")
  const [location, setLocation]         = useState("")

  const validNext = SHIPMENT_TRANSITIONS[shipment.status] ?? []

  async function transition(toStatus: ShipmentStatus) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/shipping/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:            toStatus,
          statusTitle:       STATUS_LABELS[toStatus],
          statusDescription: description || undefined,
          statusLocation:    location || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Status updated", description: `Shipment is now ${STATUS_LABELS[toStatus]}` })
        router.refresh()
        setDescription("")
        setLocation("")
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (validNext.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 text-sm text-muted-foreground">
        No further status transitions available.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Update Status</h2>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Add note <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Attempted delivery, customer absent"
              className="w-full h-8 px-3 rounded-lg border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Location (optional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mumbai hub"
              className="w-full h-8 px-3 rounded-lg border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {validNext.map((next) => (
          <Button
            key={next}
            variant={next === "DELIVERED" ? "brand" : next === "CANCELLED" || next === "DELIVERY_FAILED" ? "destructive" : "outline"}
            size="sm"
            disabled={loading}
            onClick={() => transition(next)}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Mark {STATUS_LABELS[next]}
          </Button>
        ))}
      </div>
    </div>
  )
}
