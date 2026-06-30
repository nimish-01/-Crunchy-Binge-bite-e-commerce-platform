"use client"

import { useState, useEffect } from "react"
import { Bell, Save, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const PREFS_KEY = "binge_notif_prefs_admin"

interface AdminNotifPrefs {
  inApp: boolean
  email: boolean
  categories: {
    ORDER_PLACED: boolean
    PAYMENT_FAILED: boolean
    GENERAL: boolean
    LOW_STOCK: boolean
  }
}

const DEFAULT_PREFS: AdminNotifPrefs = {
  inApp: true,
  email: true,
  categories: {
    ORDER_PLACED: true,
    PAYMENT_FAILED: true,
    GENERAL: true,
    LOW_STOCK: true,
  },
}

const CATEGORY_LABELS: Record<keyof AdminNotifPrefs["categories"], { label: string; desc: string }> = {
  ORDER_PLACED:   { label: "New Orders",         desc: "When a new order is placed by a customer" },
  PAYMENT_FAILED: { label: "Failed Payments",    desc: "When a payment attempt fails" },
  LOW_STOCK:      { label: "Low Stock Alerts",   desc: "When product stock falls below threshold" },
  GENERAL:        { label: "General Alerts",     desc: "Customer registrations, reviews, returns" },
}

function loadPrefs(): AdminNotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_PREFS
}

export default function AdminNotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<AdminNotifPrefs>(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setPrefs(loadPrefs()) }, [])

  function updateTop(key: "inApp" | "email", value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function updateCategory(key: keyof AdminNotifPrefs["categories"], value: boolean) {
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
          <p className="text-sm text-muted-foreground mt-0.5">Configure what alerts you receive</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channels</CardTitle>
          <CardDescription>How you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="admin-pref-inapp" className="text-sm font-medium">Website Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Show in the notification bell</p>
            </div>
            <Switch id="admin-pref-inapp" checked={prefs.inApp} onCheckedChange={(v) => updateTop("inApp", v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="admin-pref-email" className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Receive alerts via email</p>
            </div>
            <Switch id="admin-pref-email" checked={prefs.email} onCheckedChange={(v) => updateTop("email", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Types</CardTitle>
          <CardDescription>Events you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {(Object.keys(CATEGORY_LABELS) as Array<keyof AdminNotifPrefs["categories"]>).map((key, i, arr) => (
            <div key={key}>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Label htmlFor={`admin-cat-${key}`} className="text-sm font-medium cursor-pointer">
                    {CATEGORY_LABELS[key].label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[key].desc}</p>
                </div>
                <Switch
                  id={`admin-cat-${key}`}
                  checked={prefs.categories[key]}
                  onCheckedChange={(v) => updateCategory(key, v)}
                />
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="brand" onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          {saved ? "Saved!" : "Save Preferences"}
        </Button>
        <Button variant="ghost" onClick={handleReset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Preferences are saved in this browser.</p>
    </div>
  )
}
