"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

export function CouponToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    await fetch(`/api/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    router.refresh()
    setSaving(false)
  }

  return (
    <Switch checked={isActive} onCheckedChange={toggle} disabled={saving} />
  )
}

export function CouponDeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm("Delete this coupon? If it has been used by orders, it will be deactivated instead.")) return
    setDeleting(true)
    const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" })
    const data = await res.json()
    toast({ title: data.message ?? (data.success ? "Deleted" : data.error), variant: data.success ? "default" : "destructive" })
    router.refresh()
    setDeleting(false)
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  )
}
