"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface LoyaltySettings {
  pointsPerRupee:         number
  redemptionRate:         number
  maxRedemptionPercent:   number
  reviewPoints:           number
  referralReferrerPoints: number
  referralRefereePoints:  number
  birthdayPoints:         number
}

export default function LoyaltySettingsForm({ settings }: { settings: LoyaltySettings }) {
  const router  = useRouter()
  const [form, setForm]     = useState(settings)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState("")

  function onChange(key: keyof LoyaltySettings, val: string) {
    setForm((f) => ({ ...f, [key]: parseFloat(val) || 0 }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res  = await fetch("/api/admin/loyalty-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setMsg(data.success ? "Settings saved successfully" : (data.error ?? "Error saving"))
    setLoading(false)
    router.refresh()
  }

  const fields: { key: keyof LoyaltySettings; label: string; help: string; step: string }[] = [
    { key: "pointsPerRupee",         label: "Points per ₹ spent",             help: "e.g. 1 = 1 point per ₹1",    step: "0.1" },
    { key: "redemptionRate",          label: "₹ value per point redeemed",     help: "e.g. 0.5 = ₹0.50 per point", step: "0.1" },
    { key: "maxRedemptionPercent",    label: "Max redemption % per order",     help: "e.g. 20 = up to 20% off",    step: "1" },
    { key: "reviewPoints",            label: "Points for writing a review",    help: "",                            step: "1" },
    { key: "referralReferrerPoints",  label: "Points for referrer",            help: "Awarded when referee orders", step: "1" },
    { key: "referralRefereePoints",   label: "Points for referee",             help: "Awarded on first order",      step: "1" },
    { key: "birthdayPoints",          label: "Birthday bonus points",          help: "Awarded on user's birthday",  step: "1" },
  ]

  return (
    <form onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-6 space-y-5">
      <h2 className="font-semibold text-lg">Point Rules</h2>

      <div className="grid md:grid-cols-2 gap-5">
        {fields.map(({ key, label, help, step }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1.5">{label}</label>
            <input
              type="number"
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              step={step}
              min="0"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
          </div>
        ))}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${
          msg.includes("success") ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
        }`}>
          {msg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </form>
  )
}
