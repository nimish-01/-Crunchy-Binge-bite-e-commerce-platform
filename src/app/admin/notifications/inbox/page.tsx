"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, BellOff, CheckCheck, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { getNotificationLink } from "@/lib/notifications/deep-links"
import type { Notification } from "@prisma/client"

const TYPE_ICONS: Record<string, string> = {
  ORDER_PLACED: "🛍️",
  ORDER_STATUS_UPDATE: "📦",
  PAYMENT_SUCCESS: "✅",
  PAYMENT_FAILED: "❌",
  LOW_STOCK: "⚠️",
  BACK_IN_STOCK: "🔄",
  COUPON_AVAILABLE: "🎟️",
  LOYALTY_POINTS: "⭐",
  GENERAL: "🔔",
}

export default function AdminNotificationsInboxPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchNotifications = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?page=${pg}`)
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
        setTotalPages(data.pagination?.pages ?? 1)
        setPage(pg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotifications(1) }, [fetchNotifications])

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  async function deleteItem(id: string) {
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  function handleItemClick(n: Notification) {
    if (!n.isRead) markRead(n.id)
    router.push(getNotificationLink(n, "admin"))
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-brand-400" />
          <h1 className="text-xl font-bold">Your Notifications</h1>
          {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount} new</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchNotifications(page)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-accent/40 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center">
            <BellOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No notifications</p>
          <p className="text-sm text-muted-foreground">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={cn(
                "group relative flex gap-3 rounded-xl border p-4 transition-all cursor-pointer",
                n.isRead
                  ? "border-border/30 bg-card/50 hover:border-border/60"
                  : "border-brand-500/30 bg-brand-500/5 hover:border-brand-500/50"
              )}
            >
              <div className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? "🔔"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className={cn("text-sm font-medium leading-tight", !n.isRead && "text-foreground")}>
                    {n.title}
                  </p>
                  {!n.isRead && <div className="h-2 w-2 rounded-full bg-brand-500 shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.body}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1.5">{formatDateTime(n.createdAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteItem(n.id) }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                aria-label="Delete notification"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => fetchNotifications(page - 1)} disabled={page <= 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => fetchNotifications(page + 1)} disabled={page >= totalPages}>Next</Button>
        </div>
      )}
    </div>
  )
}
