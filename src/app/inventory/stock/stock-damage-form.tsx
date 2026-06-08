"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, PackageX } from "lucide-react"

interface Variant {
  id: string
  weight: string
  stock: number
  lowStockThreshold: number
  sku: string
  product: { id: string; name: string; images: string[] }
}

interface Props {
  variants: Variant[]
}

export default function StockDamageForm({ variants }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [variantId, setVariantId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const selected = variants.find((v) => v.id === variantId)
  const qty = parseInt(quantity || "0")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!variantId || !quantity || !notes.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/inventory/damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: qty, notes }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: "Damage recorded", description: data.message })
      setVariantId("")
      setQuantity("")
      setNotes("")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record damage"
      toast({ title: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3">
        Recording damage permanently removes units from stock. This action is logged in the audit trail.
        Notes are required.
      </div>

      <div className="space-y-1.5">
        <Label>Product Variant *</Label>
        <Select value={variantId} onValueChange={(v) => { setVariantId(v); setQuantity("") }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a variant" />
          </SelectTrigger>
          <SelectContent>
            {variants.filter((v) => v.stock > 0).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.product.name} — {v.weight} (Stock: {v.stock})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-sm">
          <p className="font-medium">{selected.product.name} ({selected.weight})</p>
          <p className="text-muted-foreground">SKU: {selected.sku}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-brand-400 font-bold">Available Stock: {selected.stock}</span>
            {selected.stock <= selected.lowStockThreshold && (
              <Badge variant="warning" className="text-xs">Low Stock</Badge>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Damaged Quantity *</Label>
        <Input
          type="number"
          min="1"
          max={selected?.stock ?? undefined}
          placeholder="e.g. 5"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        {selected && qty > 0 && qty <= selected.stock && (
          <p className="text-xs text-muted-foreground">
            Remaining stock after: {selected.stock - qty} units
          </p>
        )}
        {selected && qty > selected.stock && (
          <p className="text-xs text-red-400">
            Cannot exceed available stock ({selected.stock} units)
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Reason / Notes *</Label>
        <Textarea
          placeholder="Physical damage, spoilage, broken packaging…"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
        />
      </div>

      <Button
        type="submit"
        variant="destructive"
        disabled={
          loading ||
          !variantId ||
          !quantity ||
          !notes.trim() ||
          (selected ? qty > selected.stock || qty <= 0 : true)
        }
        className="w-full sm:w-auto"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
        ) : (
          <><PackageX className="h-4 w-4 mr-2" />Record Damage</>
        )}
      </Button>
    </form>
  )
}
