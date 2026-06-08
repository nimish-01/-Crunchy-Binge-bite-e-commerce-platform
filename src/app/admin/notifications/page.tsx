"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Send, Loader2 } from "lucide-react"

export default function AdminNotificationsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ target: "ALL", title: "", body: "" })

  async function handleSend() {
    if (!form.title || !form.body) return
    setLoading(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Notification sent!", description: `Sent to ${data.data.count} users` })
        setForm({ target: "ALL", title: "", body: "" })
      } else {
        toast({ title: data.error ?? "Failed", variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Notification Center</h1>

      <Card>
        <CardHeader><CardTitle>Broadcast Notification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Target Audience</Label>
            <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Customers</SelectItem>
                <SelectItem value="SUBSCRIBERS">Subscribers Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              placeholder="Flash Sale! 20% off today only"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea
              placeholder="Use code FLASH20 for 20% off on all products. Valid till midnight."
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <Button variant="brand" onClick={handleSend} disabled={loading || !form.title || !form.body}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <><Send className="h-4 w-4" />Send Notification</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
