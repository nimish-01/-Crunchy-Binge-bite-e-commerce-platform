"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { homepageQuoteSchema, type HomepageQuoteInput } from "@/lib/validations/homepage"
import type { HomepageQuote } from "@prisma/client"

interface Props { initialQuotes: HomepageQuote[] }

function QuoteDialog({
  quote,
  onSaved,
}: {
  quote?: HomepageQuote
  onSaved: (q: HomepageQuote) => void
}) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const isEdit = !!quote

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HomepageQuoteInput>({
    resolver: zodResolver(homepageQuoteSchema),
    defaultValues: quote
      ? { text: quote.text, name: quote.name, city: quote.city, rating: quote.rating, sortOrder: quote.sortOrder, isActive: quote.isActive }
      : { rating: 5, sortOrder: 0, isActive: true },
  })

  async function onSubmit(data: HomepageQuoteInput) {
    const url = isEdit
      ? `/api/admin/cms/homepage/quotes/${quote!.id}`
      : "/api/admin/cms/homepage/quotes"
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) {
      toast({ title: "Failed to save quote", variant: "destructive" })
      return
    }
    toast({ title: isEdit ? "Quote updated!" : "Quote added!" })
    onSaved(json.quote)
    setOpen(false)
    if (!isEdit) reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="brand" size="sm">
            <Plus className="h-4 w-4 mr-1" />Add Quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Quote" : "Add Customer Quote"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Quote Text *</Label>
            <Textarea rows={3} placeholder="Best makhana I've ever had…" {...register("text")} />
            {errors.text && <p className="text-xs text-destructive">{errors.text.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer Name *</Label>
              <Input placeholder="Priya S." {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input placeholder="Bengaluru" {...register("city")} />
              {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <Select
                defaultValue={String(watch("rating"))}
                onValueChange={(v) => setValue("rating", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <SelectItem key={r} value={String(r)}>{"★".repeat(r)} ({r}/5)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" placeholder="0" {...register("sortOrder", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={watch("isActive")}
              onCheckedChange={(v) => setValue("isActive", v)}
            />
            <Label>Active (visible on homepage)</Label>
          </div>
          <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />{isEdit ? "Saving…" : "Adding…"}</>
              : isEdit ? "Save Changes" : "Add Quote"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function QuotesManager({ initialQuotes }: Props) {
  const [quotes, setQuotes] = useState<HomepageQuote[]>(initialQuotes)
  const { toast } = useToast()

  function handleSaved(updated: HomepageQuote) {
    setQuotes((prev) => {
      const idx = prev.findIndex((q) => q.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/cms/homepage/quotes/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (!json.success) { toast({ title: "Delete failed", variant: "destructive" }); return }
    setQuotes((prev) => prev.filter((q) => q.id !== id))
    toast({ title: "Quote removed." })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Customer Quotes</CardTitle>
        <QuoteDialog onSaved={handleSaved} />
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No quotes yet. Add your first customer testimonial.
          </p>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="rounded-lg border border-border/50 bg-muted/30 p-4 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3 w-3 ${s <= q.rating ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    {!q.isActive && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">&quot;{q.text}&quot;</p>
                  <p className="text-xs font-medium mt-1">{q.name} · {q.city}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <QuoteDialog quote={q} onSaved={handleSaved} />
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(q.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
