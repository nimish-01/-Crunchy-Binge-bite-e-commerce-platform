"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Truck, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react"

interface Courier {
  id: string
  name: string
  website?: string | null
  trackingUrlPattern?: string | null
  supportPhone?: string | null
  supportEmail?: string | null
  logo?: string | null
  isActive: boolean
  priority: number
  shipmentCount: number
}

interface Props {
  initialCouriers: Courier[]
}

const PRESETS = [
  { name: "Shiprocket",   website: "https://shiprocket.in",   trackingUrlPattern: "https://shiprocket.co/tracking/{tracking}" },
  { name: "Delhivery",    website: "https://delhivery.com",    trackingUrlPattern: "https://www.delhivery.com/track/package/{tracking}" },
  { name: "Blue Dart",    website: "https://bluedart.com",     trackingUrlPattern: "https://www.bluedart.com/web/guest/trackdartcount?trackFor=0&trackNum={tracking}" },
  { name: "DTDC",         website: "https://dtdc.in",          trackingUrlPattern: "https://www.dtdc.in/tracking/tracking_results.asp?Ttype=single&TNo={tracking}" },
  { name: "Shadowfax",    website: "https://shadowfax.in",     trackingUrlPattern: "" },
  { name: "XpressBees",   website: "https://xpressbees.com",   trackingUrlPattern: "" },
  { name: "Ekart",        website: "https://ekartlogistics.com", trackingUrlPattern: "" },
]

const EMPTY_FORM = { name: "", website: "", trackingUrlPattern: "", supportPhone: "", supportEmail: "", priority: 0 }

export function CourierManager({ initialCouriers }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [couriers, setCouriers] = useState(initialCouriers)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openAdd(preset?: typeof PRESETS[0]) {
    setEditId(null)
    setForm(preset ? { ...EMPTY_FORM, ...preset, priority: 0 } : EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(c: Courier) {
    setEditId(c.id)
    setForm({ name: c.name, website: c.website ?? "", trackingUrlPattern: c.trackingUrlPattern ?? "", supportPhone: c.supportPhone ?? "", supportEmail: c.supportEmail ?? "", priority: c.priority })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const url = editId ? `/api/admin/shipping/couriers/${editId}` : `/api/admin/shipping/couriers`
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: editId ? "Courier updated" : "Courier created" })
        setShowForm(false)
        setEditId(null)
        router.refresh()
        // optimistic update
        if (editId) {
          setCouriers(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c))
        } else {
          setCouriers(prev => [{ ...data.data.courier, shipmentCount: 0 }, ...prev])
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

  async function toggleActive(c: Courier) {
    setTogglingId(c.id)
    try {
      await fetch(`/api/admin/shipping/couriers/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      })
      setCouriers(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x))
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteCourier(c: Courier) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return
    setDeletingId(c.id)
    try {
      const res = await fetch(`/api/admin/shipping/couriers/${c.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setCouriers(prev => prev.filter(x => x.id !== c.id))
        toast({ title: "Courier deleted" })
      } else {
        toast({ title: "Cannot delete", description: data.error, variant: "destructive" })
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <p className="text-sm font-medium mb-3">Add from presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => openAdd(p)}
              className="px-3 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-colors"
            >
              + {p.name}
            </button>
          ))}
          <button
            onClick={() => openAdd()}
            className="px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />Custom
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/4 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editId ? "Edit Courier" : "New Courier"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "name",               label: "Name *",              placeholder: "e.g. Delhivery" },
              { key: "website",            label: "Website",             placeholder: "https://..." },
              { key: "trackingUrlPattern", label: "Tracking URL Pattern", placeholder: "Use {tracking} as placeholder" },
              { key: "supportPhone",       label: "Support Phone",       placeholder: "+91..." },
              { key: "supportEmail",       label: "Support Email",       placeholder: "support@..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <input
                  value={(form as Record<string, string | number>)[key] as string}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Priority (higher = shown first)</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="brand" size="sm" onClick={save} disabled={loading || !form.name.trim()}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              {editId ? "Save Changes" : "Add Courier"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {couriers.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No couriers added yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Tracking Pattern</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Shipments</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {couriers.map((c) => (
                <tr key={c.id} className={`hover:bg-accent/30 transition-colors ${!c.isActive ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-brand-400 transition-colors">{c.website}</a>}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <code className="text-xs text-muted-foreground">{c.trackingUrlPattern ?? "—"}</code>
                  </td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <span className="text-sm tabular-nums">{c.shipmentCount}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={togglingId === c.id}
                      className={`w-8 h-5 rounded-full transition-colors ${c.isActive ? "bg-green-500" : "bg-muted"} relative`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${c.isActive ? "left-3.5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {c.shipmentCount === 0 && (
                        <button onClick={() => deleteCourier(c)} disabled={deletingId === c.id} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
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
