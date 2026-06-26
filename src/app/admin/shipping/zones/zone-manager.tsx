"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { MapPin, Plus, Pencil, Trash2, Loader2, X, Check, ChevronDown } from "lucide-react"

interface Zone {
  id: string
  name: string
  states: string[]
  cities: string[]
  pincodes: string[]
  deliveryCharge: number
  freeDeliveryThreshold: number
  estimatedDaysMin: number
  estimatedDaysMax: number
  expressEnabled: boolean
  expressCharge: number
  expressDaysMin: number
  expressDaysMax: number
  codEnabled: boolean
  codMinOrderValue: number
  isActive: boolean
  sortOrder: number
}

const EMPTY: Omit<Zone, "id"> = {
  name: "",
  states: [],
  cities: [],
  pincodes: [],
  deliveryCharge: 0,
  freeDeliveryThreshold: 499,
  estimatedDaysMin: 3,
  estimatedDaysMax: 5,
  expressEnabled: false,
  expressCharge: 0,
  expressDaysMin: 1,
  expressDaysMax: 2,
  codEnabled: true,
  codMinOrderValue: 0,
  isActive: true,
  sortOrder: 0,
}

interface Props { initialZones: Zone[] }

export function ZoneManager({ initialZones }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [zones, setZones] = useState(initialZones)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pincodeInput, setPincodeInput] = useState("")

  function openAdd() { setEditId(null); setForm(EMPTY); setPincodeInput(""); setShowForm(true) }
  function openEdit(z: Zone) {
    setEditId(z.id)
    setForm({ name: z.name, states: z.states, cities: z.cities, pincodes: z.pincodes, deliveryCharge: z.deliveryCharge, freeDeliveryThreshold: z.freeDeliveryThreshold, estimatedDaysMin: z.estimatedDaysMin, estimatedDaysMax: z.estimatedDaysMax, expressEnabled: z.expressEnabled, expressCharge: z.expressCharge, expressDaysMin: z.expressDaysMin, expressDaysMax: z.expressDaysMax, codEnabled: z.codEnabled, codMinOrderValue: z.codMinOrderValue, isActive: z.isActive, sortOrder: z.sortOrder })
    setPincodeInput("")
    setShowForm(true)
  }

  function addPincodes() {
    const pins = pincodeInput.split(/[\s,;]+/).map(p => p.trim()).filter(p => /^\d{6}$/.test(p))
    if (pins.length === 0) return
    setForm(f => ({ ...f, pincodes: [...new Set([...f.pincodes, ...pins])] }))
    setPincodeInput("")
  }

  async function save() {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const url = editId ? `/api/admin/shipping/zones/${editId}` : `/api/admin/shipping/zones`
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: editId ? "Zone updated" : "Zone created" })
        setShowForm(false)
        if (editId) {
          setZones(prev => prev.map(z => z.id === editId ? { ...z, ...form } : z))
        } else {
          setZones(prev => [...prev, data.data.zone])
        }
        router.refresh()
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function deleteZone(z: Zone) {
    if (!confirm(`Delete zone "${z.name}"?`)) return
    setDeletingId(z.id)
    try {
      await fetch(`/api/admin/shipping/zones/${z.id}`, { method: "DELETE" })
      setZones(prev => prev.filter(x => x.id !== z.id))
      toast({ title: "Zone deleted" })
    } finally {
      setDeletingId(null)
    }
  }

  const num = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="brand" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" />Add Zone
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/4 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editId ? "Edit Zone" : "New Delivery Zone"}</h3>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Zone Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Metro Cities" className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* PIN codes */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">PIN Codes</label>
            <div className="flex gap-2 mb-2">
              <input value={pincodeInput} onChange={e => setPincodeInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addPincodes()} placeholder="Enter 6-digit PINs, comma or space separated" className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              <Button variant="outline" size="sm" onClick={addPincodes} type="button">Add</Button>
            </div>
            {form.pincodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {form.pincodes.map(pin => (
                  <span key={pin} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-xs font-mono">
                    {pin}
                    <button onClick={() => setForm(f => ({ ...f, pincodes: f.pincodes.filter(p => p !== pin) }))} className="text-muted-foreground hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{form.pincodes.length} PIN codes added</p>
          </div>

          {/* Delivery settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: "deliveryCharge", label: "Delivery Charge (₹)" },
              { key: "freeDeliveryThreshold", label: "Free Above (₹)" },
              { key: "estimatedDaysMin", label: "Min Days" },
              { key: "estimatedDaysMax", label: "Max Days" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <input type="number" min="0" value={(form as Record<string, unknown>)[key] as number} onChange={num(key as keyof typeof form)} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            {[
              { key: "codEnabled", label: "COD Available" },
              { key: "expressEnabled", label: "Express Delivery" },
              { key: "isActive", label: "Active" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={(form as Record<string, unknown>)[key] as boolean} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="accent-brand-500 w-4 h-4 rounded" />
                {label}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="brand" size="sm" onClick={save} disabled={loading || !form.name.trim()}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              {editId ? "Save Changes" : "Create Zone"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {zones.length === 0 ? (
          <div className="py-16 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No delivery zones configured</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">PINs</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Charge / Free Above</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Est. Days</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">COD</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {zones.map((z) => (
                <tr key={z.id} className={`hover:bg-accent/30 transition-colors ${!z.isActive ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm">{z.name}</p>
                    {!z.isActive && <span className="text-[10px] text-muted-foreground">Inactive</span>}
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground tabular-nums">{z.pincodes.length} PINs</span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs">{z.deliveryCharge === 0 ? "FREE" : `₹${z.deliveryCharge}`} / free ≥₹{z.freeDeliveryThreshold}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs">{z.estimatedDaysMin}–{z.estimatedDaysMax} days</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs ${z.codEnabled ? "text-green-400" : "text-muted-foreground"}`}>{z.codEnabled ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(z)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteZone(z)} disabled={deletingId === z.id} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        {deletingId === z.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
