"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Tag, Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react"

interface Rate {
  id: string
  name: string
  type: string
  courierId?: string | null
  courierName?: string | null
  minWeightGrams?: number | null
  maxWeightGrams?: number | null
  minOrderValue?: number | null
  maxOrderValue?: number | null
  price: number
  isCOD: boolean
  isExpress: boolean
  isActive: boolean
  priority: number
}

interface Courier { id: string; name: string }

const EMPTY = {
  name: "", type: "FLAT", courierId: "", minWeightGrams: "", maxWeightGrams: "",
  minOrderValue: "", maxOrderValue: "", price: 0, isCOD: false, isExpress: false, isActive: true, priority: 0,
}

interface Props {
  initialRates: Rate[]
  couriers: Courier[]
}

export function RatesManager({ initialRates, couriers }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [rates, setRates] = useState(initialRates)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openAdd() { setEditId(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(r: Rate) {
    setEditId(r.id)
    setForm({
      name: r.name, type: r.type, courierId: r.courierId ?? "",
      minWeightGrams: r.minWeightGrams?.toString() ?? "", maxWeightGrams: r.maxWeightGrams?.toString() ?? "",
      minOrderValue: r.minOrderValue?.toString() ?? "", maxOrderValue: r.maxOrderValue?.toString() ?? "",
      price: r.price, isCOD: r.isCOD, isExpress: r.isExpress, isActive: r.isActive, priority: r.priority,
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        courierId: form.courierId || null,
        minWeightGrams: form.minWeightGrams ? parseInt(form.minWeightGrams as string) : null,
        maxWeightGrams: form.maxWeightGrams ? parseInt(form.maxWeightGrams as string) : null,
        minOrderValue:  form.minOrderValue  ? parseFloat(form.minOrderValue  as string) : null,
        maxOrderValue:  form.maxOrderValue  ? parseFloat(form.maxOrderValue  as string) : null,
      }
      const url = editId ? `/api/admin/shipping/rates/${editId}` : `/api/admin/shipping/rates`
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: editId ? "Rate updated" : "Rate created" })
        setShowForm(false)
        router.refresh()
        if (editId) {
          setRates(prev => prev.map(r => r.id === editId ? { ...r, ...data.data.rate, courierName: couriers.find(c => c.id === payload.courierId)?.name ?? null } : r))
        } else {
          setRates(prev => [...prev, { ...data.data.rate, courierName: couriers.find(c => c.id === payload.courierId)?.name ?? null }])
        }
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function deleteRate(r: Rate) {
    if (!confirm(`Delete rate "${r.name}"?`)) return
    setDeletingId(r.id)
    try {
      await fetch(`/api/admin/shipping/rates/${r.id}`, { method: "DELETE" })
      setRates(prev => prev.filter(x => x.id !== r.id))
      toast({ title: "Rate deleted" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="brand" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" />Add Rate
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/4 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editId ? "Edit Rate" : "New Shipping Rate"}</h3>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Delivery" className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="FLAT">Flat Rate</option>
                <option value="WEIGHT_BASED">Weight Based</option>
                <option value="ORDER_VALUE_BASED">Order Value Based</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Courier (optional)</label>
              <select value={form.courierId} onChange={e => setForm(f => ({ ...f, courierId: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Any / All</option>
                {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Price (₹)</label>
              <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {form.type === "WEIGHT_BASED" && (<>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Min Weight (g)</label>
                <input type="number" min="0" value={form.minWeightGrams} onChange={e => setForm(f => ({ ...f, minWeightGrams: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Max Weight (g)</label>
                <input type="number" min="0" value={form.maxWeightGrams} onChange={e => setForm(f => ({ ...f, maxWeightGrams: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>)}
            {form.type === "ORDER_VALUE_BASED" && (<>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Min Order Value (₹)</label>
                <input type="number" min="0" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Max Order Value (₹)</label>
                <input type="number" min="0" value={form.maxOrderValue} onChange={e => setForm(f => ({ ...f, maxOrderValue: e.target.value }))} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>)}
          </div>
          <div className="flex flex-wrap gap-4">
            {[{ key: "isCOD", label: "COD Rate" }, { key: "isExpress", label: "Express Rate" }, { key: "isActive", label: "Active" }].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={(form as Record<string, unknown>)[key] as boolean} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="accent-brand-500 w-4 h-4 rounded" />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="brand" size="sm" onClick={save} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              {editId ? "Save" : "Create"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {rates.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No shipping rates configured</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Courier</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Flags</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rates.map((r) => (
                <tr key={r.id} className={`hover:bg-accent/30 transition-colors ${!r.isActive ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3.5"><p className="font-medium text-sm">{r.name}</p></td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-xs text-muted-foreground">{r.type.replace("_", " ")}</span></td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-xs text-muted-foreground">{r.courierName ?? "Any"}</span></td>
                  <td className="px-4 py-3.5 text-right"><span className="text-sm font-semibold">₹{r.price}</span></td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <div className="flex items-center justify-center gap-1.5">
                      {r.isCOD     && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/25">COD</span>}
                      {r.isExpress && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25">EXPRESS</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteRate(r)} disabled={deletingId === r.id} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
