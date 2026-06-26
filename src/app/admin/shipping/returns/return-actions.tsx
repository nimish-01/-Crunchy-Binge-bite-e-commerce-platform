"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ChevronDown } from "lucide-react"

const TRANSITIONS: Record<string, string[]> = {
  PENDING:   ["APPROVED", "REJECTED"],
  APPROVED:  ["PICKED"],
  PICKED:    ["RECEIVED"],
  RECEIVED:  ["REFUNDED"],
  REJECTED:  [],
  COMPLETED: [],
  REFUNDED:  [],
}

const LABELS: Record<string, string> = {
  APPROVED: "Approve",
  REJECTED: "Reject",
  PICKED:   "Mark Picked",
  RECEIVED: "Mark Received",
  REFUNDED: "Mark Refunded",
}

interface Props {
  returnId: string
  currentStatus: string
  adminNotes: string
}

export function ReturnActions({ returnId, currentStatus, adminNotes: initial }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading]   = useState<string | null>(null)
  const [notes, setNotes]       = useState(initial)
  const [showNotes, setShowNotes] = useState(false)

  const next = TRANSITIONS[currentStatus] ?? []

  async function update(status: string) {
    setLoading(status)
    try {
      const res = await fetch(`/api/admin/shipping/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Return updated" })
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

  if (next.length === 0) {
    return <div className="text-xs text-muted-foreground">No further actions</div>
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {showNotes && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Admin notes (optional)..."
          rows={2}
          className="w-52 px-3 py-2 rounded-lg border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNotes((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Notes <ChevronDown className={`h-3 w-3 transition-transform ${showNotes ? "rotate-180" : ""}`} />
        </button>
        {next.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === "REJECTED" ? "destructive" : s === "APPROVED" || s === "REFUNDED" ? "brand" : "outline"}
            disabled={!!loading}
            onClick={() => update(s)}
          >
            {loading === s ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            {LABELS[s] ?? s}
          </Button>
        ))}
      </div>
    </div>
  )
}
