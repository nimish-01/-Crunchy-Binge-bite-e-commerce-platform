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
import { Loader2, SlidersHorizontal } from "lucide-react"

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

export default function StockAdjustForm({ variants }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [variantId, setVariantId] = useState("")
  const [newStock, setNewStock] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const selected = variants.find((v) => v.id === variantId)
  const diff = selected && newStock !== "" ? parseInt(newStock) - selected.stock : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!variantId || newStock === "") return
    setLoading(true)
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, newStock: parseInt(newStock), notes }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: "Stock adjusted!", description: data.message })
      setVariantId("")
      setNewStock("")
      setNotes("")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to adjust stock"
      toast({ title: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs p-3">
        Manual adjustment sets the exact stock level. Use only for corrections after a physical count.
        Notes are required.
      </div>

      <div className="space-y-1.5">
        <Label>Product Variant *</Label>
        <Select value={variantId} onValueChange={(v) => { setVariantId(v); setNewStock("") }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a variant" />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
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
            <span className="text-brand-400 font-bold">Current Stock: {selected.stock}</span>
            {selected.stock === 0 && <Badge variant="destructive" className="text-xs">Out of Stock</Badge>}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>New Stock Level *</Label>
        <Input
          type="number"
          min="0"
          placeholder="Enter the correct stock count"
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
          required
        />
        {diff !== null && (
          <p className={`text-xs font-medium ${diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {diff > 0 ? `+${diff}` : diff} units compared to current stock
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Reason / Notes *</Label>
        <Textarea
          placeholder="Physical count discrepancy, system correction…"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
        />
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={loading || !variantId || newStock === "" || !notes.trim()}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
        ) : (
          <><SlidersHorizontal className="h-4 w-4 mr-2" />Adjust Stock</>
        )}
      </Button>
    </form>
  )
}
