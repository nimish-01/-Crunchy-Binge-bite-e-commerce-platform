"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Eye, Loader2, Sparkles, Star, Zap, Ban } from "lucide-react"
import type { SiteSettings } from "@prisma/client"

const ANIMATIONS = [
  { value: "CONFETTI",  label: "Confetti",  icon: Sparkles, desc: "Colorful falling confetti — festive and fun" },
  { value: "FIREWORKS", label: "Fireworks", icon: Zap,      desc: "CSS firework bursts — dramatic and exciting" },
  { value: "STARS",     label: "Stars",     icon: Star,     desc: "Falling gold stars — elegant and celebratory" },
  { value: "NONE",      label: "None",      icon: Ban,      desc: "No animation — clean and minimal" },
] as const

interface Props { settings: SiteSettings }

export default function DeliveryPageSettingsForm({ settings }: Props) {
  const router = useRouter()
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)
  const [form, setForm] = useState({
    deliveryHeadline:    settings.deliveryHeadline    ?? "Order placed successfully! 🎉",
    deliveryMessage:     settings.deliveryMessage     ?? "Thank you! We're preparing your order right away.",
    deliveryAnimation:   settings.deliveryAnimation   ?? "CONFETTI",
    deliveryShowRating:  settings.deliveryShowRating  ?? true,
    deliveryShowReorder: settings.deliveryShowReorder ?? true,
  })

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch("/api/admin/settings/delivery-page", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Preview Banner */}
      <div className="rounded-xl border border-brand-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-brand-500/10 p-6 text-center relative overflow-hidden">
        <div className="absolute top-3 left-4 text-2xl animate-bounce [animation-delay:0.2s]">🎉</div>
        <div className="absolute top-4 right-5 text-xl animate-bounce [animation-delay:0.6s]">✨</div>
        <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <div className="h-12 w-12 rounded-full bg-green-500/30 flex items-center justify-center text-2xl">✓</div>
        </div>
        <p className="text-xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-1">
          {form.deliveryHeadline || "Your headline here"}
        </p>
        <p className="text-sm text-muted-foreground">{form.deliveryMessage || "Your message here"}</p>
        <p className="text-xs text-brand-400 mt-2 font-mono">BB-ORDER-001</p>

        <div className="flex justify-center gap-3 mt-4 flex-wrap">
          {form.deliveryShowReorder && (
            <span className="px-3 py-1.5 bg-brand-500/20 text-brand-400 rounded-lg text-xs font-medium">Shop More</span>
          )}
          {form.deliveryShowReorder && (
            <span className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium">Reorder</span>
          )}
        </div>

      </div>

      {/* Headline */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">Headline</label>
        <input
          type="text"
          value={form.deliveryHeadline}
          onChange={(e) => update("deliveryHeadline", e.target.value)}
          placeholder="Your order has been delivered! 🎉"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <p className="text-xs text-muted-foreground">Emojis welcome — keep it celebratory!</p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">Message</label>
        <textarea
          rows={3}
          value={form.deliveryMessage}
          onChange={(e) => update("deliveryMessage", e.target.value)}
          placeholder="We hope you love your Crunchy Bingebite snacks..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
        />
      </div>

      {/* Animation */}
      <div className="space-y-3">
        <label className="text-sm font-medium block">Animation Style</label>
        <div className="grid grid-cols-2 gap-3">
          {ANIMATIONS.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => update("deliveryAnimation", value)}
              className={`
                p-4 rounded-xl border text-left transition-all
                ${form.deliveryAnimation === value
                  ? "border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30"
                  : "border-border hover:border-brand-500/40 hover:bg-accent"}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${form.deliveryAnimation === value ? "text-brand-400" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm">{label}</span>
                {form.deliveryAnimation === value && (
                  <span className="ml-auto text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-full">Active</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <label className="text-sm font-medium block">Display Options</label>
        <div className="space-y-2">
          {[
            { key: "deliveryShowReorder" as const, label: "Show Shop More / Wishlist CTA", desc: "Display action buttons below the celebration banner" },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer">
              <input
                type="checkbox"
                checked={form[key] as boolean}
                onChange={(e) => update(key, e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-500"
              />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
        <a
          href="/order-success?order=BB-PREVIEW"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-accent text-sm font-medium transition-colors"
        >
          <Eye className="h-4 w-4" />
          Preview
        </a>
      </div>

      {saved && (
        <p className="text-sm text-green-500 flex items-center gap-1">
          ✓ Order success page settings saved!
        </p>
      )}
    </div>
  )
}
