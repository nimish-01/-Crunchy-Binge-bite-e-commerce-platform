"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, PackageCheck, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Props {
  returnId: string
  currentStatus: string
}

type Action = "APPROVED" | "REJECTED" | "COMPLETED"

export function ReturnActionsButton({ returnId, currentStatus }: Props) {
  const router = useRouter()
  const [dialogAction, setDialogAction] = useState<Action | null>(null)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleConfirm() {
    if (!dialogAction) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: dialogAction, adminNotes: notes.trim() || undefined }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? "Failed"); return }
      setDialogAction(null)
      setNotes("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Action <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {currentStatus === "PENDING" && (
            <>
              <DropdownMenuItem onClick={() => setDialogAction("APPROVED")} className="gap-2 text-green-500">
                <Check className="h-4 w-4" /> Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialogAction("REJECTED")} className="gap-2 text-destructive">
                <X className="h-4 w-4" /> Reject
              </DropdownMenuItem>
            </>
          )}
          {currentStatus === "APPROVED" && (
            <>
              <DropdownMenuItem onClick={() => setDialogAction("COMPLETED")} className="gap-2">
                <PackageCheck className="h-4 w-4" /> Mark Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDialogAction("REJECTED")} className="gap-2 text-destructive">
                <X className="h-4 w-4" /> Reject
              </DropdownMenuItem>
            </>
          )}
          {currentStatus === "REJECTED" && (
            <DropdownMenuItem onClick={() => setDialogAction("APPROVED")} className="gap-2 text-green-500">
              <Check className="h-4 w-4" /> Re-approve
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!dialogAction} onOpenChange={(o) => { if (!o) { setDialogAction(null); setNotes(""); setError("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "APPROVED" ? "Approve Return"
                : dialogAction === "REJECTED" ? "Reject Return"
                : "Mark as Completed"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="notes">Notes for customer (optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="e.g. Refund will be processed within 5–7 business days..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)} disabled={loading}>Cancel</Button>
            <Button
              variant={dialogAction === "REJECTED" ? "destructive" : "brand"}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
