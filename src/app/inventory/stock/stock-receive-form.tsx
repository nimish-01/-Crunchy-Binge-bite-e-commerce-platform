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
import { Loader2, PackagePlus } from "lucide-react"

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

export default function StockReceiveForm({ variants }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [variantId, setVariantId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const selected = variants.find((v) => v.id === variantId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!variantId || !quantity) return
    setLoading(true)
    try {
      const res = await fetch("/api/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: parseInt(quantity), notes: notes || undefined }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: "Stock received!", description: data.message })
      setVariantId("")
      setQuantity("")
      setNotes("")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to receive stock"
      toast({ title: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label>Product Variant *</Label>
        <Select value={variantId} onValueChange={setVariantId}>
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
            {selected.stock > 0 && selected.stock <= selected.lowStockThreshold && (
              <Badge variant="warning" className="text-xs">Low Stock</Badge>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Quantity to Receive *</Label>
        <Input
          type="number"
          min="1"
          placeholder="e.g. 50"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        {selected && quantity && (
          <p className="text-xs text-muted-foreground">
            New stock will be: {selected.stock + parseInt(quantity || "0")} units
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Notes (Optional)</Label>
        <Textarea
          placeholder="Supplier name, batch number, invoice reference…"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={loading || !variantId || !quantity}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
        ) : (
          <><PackagePlus className="h-4 w-4 mr-2" />Receive Stock</>
        )}
      </Button>
    </form>
  )
}
