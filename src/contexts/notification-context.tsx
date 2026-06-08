"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { Notification } from "@prisma/client"

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    try {
      const r = await fetch("/api/notifications?limit=20")
      const data = await r.json()
      if (data.success) {
        const list = data.data?.notifications ?? data.data
        setNotifications(Array.isArray(list) ? list : [])
      }
    } catch {}
  }, [userId])

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }, [])

  const safeNotifications = Array.isArray(notifications) ? notifications : []
  const unreadCount = safeNotifications.filter((n) => !n.isRead).length

  return (
    <NotificationContext.Provider value={{ notifications: safeNotifications, unreadCount, fetchNotifications, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
