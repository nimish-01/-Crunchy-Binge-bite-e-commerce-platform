"use client"

import { useState, useEffect } from "react"
import { Bell, Save, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const PREFS_KEY = "binge_notif_prefs_customer"

interface NotifPrefs {
  inApp: boolean
  email: boolean
  categories: {
    ORDER_PLACED: boolean
    ORDER_STATUS_UPDATE: boolean
    PAYMENT_SUCCESS: boolean
    PAYMENT_FAILED: boolean
    LOYALTY_POINTS: boolean
    COUPON_AVAILABLE: boolean
    GENERAL: boolean
  }
}

const DEFAULT_PREFS: NotifPrefs = {
  inApp: true,
  email: true,
  categories: {
    ORDER_PLACED: true,
    ORDER_STATUS_UPDATE: true,
    PAYMENT_SUCCESS: true,
    PAYMENT_FAILED: true,
    LOYALTY_POINTS: true,
    COUPON_AVAILABLE: true,
    GENERAL: true,
  },
}

const CATEGORY_LABELS: Record<keyof NotifPrefs["categories"], { label: string; desc: string }> = {
  ORDER_PLACED:        { label: "Order Confirmed",      desc: "When your order is placed successfully" },
  ORDER_STATUS_UPDATE: { label: "Order Status Updates", desc: "Packing, shipping, delivery updates" },
  PAYMENT_SUCCESS:     { label: "Payment Confirmed",    desc: "When your payment is processed" },
  PAYMENT_FAILED:      { label: "Payment Failed",       desc: "When a payment attempt fails" },
  LOYALTY_POINTS:      { label: "Loyalty Points",       desc: "When you earn or redeem Binge Points" },
  COUPON_AVAILABLE:    { label: "Coupons & Offers",     desc: "New coupons and promotional offers" },
  GENERAL:             { label: "General",              desc: "Announcements and other notifications" },
}

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_PREFS
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  function updateTop(key: "inApp" | "email", value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function updateCategory(key: keyof NotifPrefs["categories"], value: boolean) {
    setPrefs((p) => ({ ...p, categories: { ...p.categories, [key]: value } }))
    setSaved(false)
  }

  function handleSave() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
  }

  function handleReset() {
    setPrefs(DEFAULT_PREFS)
    localStorage.removeItem(PREFS_KEY)
    setSaved(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-brand-400" />
        <div>
          <h1 className="text-xl font-bold">Notification Preferences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control what you hear from us</p>
        </div>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channels</CardTitle>
          <CardDescription>Choose how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="pref-inapp" className="text-sm font-medium">Website Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Show in the notification bell</p>
            </div>
            <Switch
              id="pref-inapp"
              checked={prefs.inApp}
              onCheckedChange={(v) => updateTop("inApp", v)}
              aria-label="Toggle website notifications"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="pref-email" className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Receive updates via email</p>
            </div>
            <Switch
              id="pref-email"
              checked={prefs.email}
              onCheckedChange={(v) => updateTop("email", v)}
              aria-label="Toggle email notifications"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription>Choose which events to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {(Object.keys(CATEGORY_LABELS) as Array<keyof NotifPrefs["categories"]>).map((key, i, arr) => (
            <div key={key}>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Label htmlFor={`pref-cat-${key}`} className="text-sm font-medium cursor-pointer">
                    {CATEGORY_LABELS[key].label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[key].desc}</p>
                </div>
                <Switch
                  id={`pref-cat-${key}`}
                  checked={prefs.categories[key]}
                  onCheckedChange={(v) => updateCategory(key, v)}
                  disabled={!prefs.inApp && !prefs.email}
                  aria-label={`Toggle ${CATEGORY_LABELS[key].label} notifications`}
                />
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="brand" onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          {saved ? "Saved!" : "Save Preferences"}
        </Button>
        <Button variant="ghost" onClick={handleReset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Preferences are stored in your browser. Sign-in from a different device may require re-configuring.
      </p>
    </div>
  )
}
