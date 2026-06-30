"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { Notification } from "@prisma/client"

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const r = await fetch("/api/notifications?limit=20")
      const data = await r.json()
      if (data.success) {
        setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0)
      }
    } catch {
      // silent - network errors should not crash the app
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 45_000)
    // Refresh when user returns to the tab
    const onFocus = () => { fetchNotifications() }
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [fetchNotifications])

  const markRead = useCallback(async (id: string) => {
    // Optimistic update first
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
    } catch {}
  }, [])

  const markAllRead = useCallback(async () => {
    // Optimistic update first
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
    } catch {}
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    // Functional update avoids stale closure
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id)
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1))
      }
      return prev.filter((n) => n.id !== id)
    })
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" })
    } catch {}
  }, [])

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, deleteNotification }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
