"use client"

import { useState, useEffect } from "react"
import { Send, Loader2, Bell, Users, UserCheck, Package, User, Clock, Megaphone, Info, AlertTriangle, Tag, Wrench, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/utils"

const TARGETS = [
  { value: "ALL", label: "All Customers", icon: Users, desc: "All active customer accounts" },
  { value: "ALL_USERS", label: "Everyone", icon: User, desc: "All users including staff" },
  { value: "ADMINS", label: "Admin Users", icon: UserCheck, desc: "ADMIN and SUPER_ADMIN roles" },
  { value: "INVENTORY", label: "Inventory Team", icon: Package, desc: "INVENTORY_MANAGER role" },
]

const TYPES = [
  { value: "ANNOUNCEMENT", label: "Announcement", icon: Megaphone },
  { value: "PROMOTION", label: "Promotion", icon: Tag },
  { value: "INFORMATION", label: "Information", icon: Info },
  { value: "ALERT", label: "Alert", icon: AlertTriangle },
  { value: "MAINTENANCE", label: "Maintenance", icon: Wrench },
]

interface RecentBroadcast {
  id: string
  title: string
  body: string
  referenceType: string | null
  createdAt: string
  count?: number
}

export default function AdminNotificationsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<RecentBroadcast[]>([])
  const [form, setForm] = useState({
    target: "ALL",
    type: "ANNOUNCEMENT",
    title: "",
    body: "",
  })

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSend() {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: form.target, title: form.title, body: form.body, type: form.type }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Notification sent!", description: `Delivered to ${data.data.count} users` })
        setSent((prev) => [{
          id: Date.now().toString(),
          title: form.title,
          body: form.body,
          referenceType: form.type,
          createdAt: new Date().toISOString(),
          count: data.data.count,
        }, ...prev.slice(0, 9)])
        setForm({ target: "ALL", type: "ANNOUNCEMENT", title: "", body: "" })
      } else {
        toast({ title: data.error ?? "Failed to send", variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedTarget = TARGETS.find((t) => t.value === form.target)
  const selectedType = TYPES.find((t) => t.value === form.type)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send notifications to customers and staff</p>
        </div>
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Compose Notification
              </CardTitle>
              <CardDescription>Send an instant notification to your users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Target */}
              <div className="space-y-2">
                <Label>Audience</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGETS.map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => update("target", t.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                          form.target === t.value
                            ? "border-brand-500 bg-brand-500/8 ring-1 ring-brand-500/30"
                            : "border-border hover:border-border/80 hover:bg-accent"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", form.target === t.value ? "text-brand-400" : "text-muted-foreground")} />
                        <div>
                          <p className="text-xs font-semibold">{t.label}</p>
                          <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Type */}
              <div className="space-y-2">
                <Label>Notification Type</Label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => update("type", t.value)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          form.type === t.value
                            ? "border-brand-500 bg-brand-500/10 text-brand-400"
                            : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="notif-title">Title *</Label>
                <Input
                  id="notif-title"
                  placeholder="Flash Sale! Extra 20% off today only"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  maxLength={120}
                />
                <p className="text-[11px] text-muted-foreground text-right">{form.title.length}/120</p>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label htmlFor="notif-body">Message *</Label>
                <Textarea
                  id="notif-body"
                  placeholder="Use code FLASH20 at checkout. Valid till midnight tonight."
                  rows={4}
                  value={form.body}
                  onChange={(e) => update("body", e.target.value)}
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground text-right">{form.body.length}/500</p>
              </div>

              {/* Preview */}
              {(form.title || form.body) && (
                <div className="rounded-xl border border-border/50 bg-accent/30 p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                  <div className="flex gap-3">
                    <span className="text-lg">🔔</span>
                    <div>
                      <p className="text-sm font-semibold">{form.title || "Title"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{form.body || "Message"}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="brand"
                className="w-full gap-2"
                onClick={handleSend}
                disabled={loading || !form.title.trim() || !form.body.trim()}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                  : <><Send className="h-4 w-4" />Send to {selectedTarget?.label ?? "Users"}</>
                }
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Broadcasts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sent.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No notifications sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sent.map((s) => (
                    <div key={s.id} className="rounded-lg border border-border/40 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold truncate">{s.title}</p>
                        {s.count !== undefined && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{s.count}</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{s.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatDateTime(new Date(s.createdAt))}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
