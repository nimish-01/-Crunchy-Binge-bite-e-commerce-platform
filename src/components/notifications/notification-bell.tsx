"use client"

import { useState, useCallback } from "react"
import { Bell, BellOff, CheckCheck, ExternalLink } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/contexts/notification-context"
import { getNotificationLink, type NotificationPortal } from "@/lib/notifications/deep-links"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

const VIEW_ALL: Record<NotificationPortal, string> = {
  customer: "/notifications",
  admin: "/admin/notifications/inbox",
  inventory: "/inventory/notifications",
}

interface NotificationBellProps {
  portal: NotificationPortal
  className?: string
}

export default function NotificationBell({ portal, className }: NotificationBellProps) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const recent = notifications.slice(0, 8)

  const handleItemClick = useCallback(
    (n: Notification) => {
      setOpen(false)
      if (!n.isRead) markRead(n.id)
      router.push(getNotificationLink(n, portal))
    },
    [markRead, portal, router]
  )

  const handleMarkAllRead = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      markAllRead()
    },
    [markAllRead]
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
            "touch-target",
            className
          )}
          aria-label={
            unreadCount > 0
              ? `Notifications — ${unreadCount} unread`
              : "Notifications"
          }
          aria-haspopup="true"
          aria-expanded={open}
        >
          <Bell className="h-[1.1rem] w-[1.1rem]" aria-hidden />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center leading-none pointer-events-none"
              aria-hidden
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 overflow-hidden max-h-[calc(100vh-5rem)]"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span
                className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-destructive text-[9px] font-bold text-white"
                aria-label={`${unreadCount} unread notifications`}
              >
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors py-1 px-2 rounded-md hover:bg-brand-500/8 min-h-[32px]"
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="h-3 w-3" aria-hidden />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "360px" }}
          role="list"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Recent notifications"
        >
          {loading && recent.length === 0 ? (
            /* Loading skeleton */
            <div className="p-4 space-y-3" aria-busy="true" aria-label="Loading notifications">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-accent shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2.5 bg-accent rounded w-2/3" />
                    <div className="h-2 bg-accent rounded w-full" />
                    <div className="h-2 bg-accent rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div
              className="py-10 flex flex-col items-center gap-2 text-center px-4"
              role="listitem"
            >
              <BellOff className="h-8 w-8 text-muted-foreground/30" aria-hidden />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            recent.map((n) => (
              <button
                key={n.id}
                role="listitem"
                onClick={() => handleItemClick(n)}
                className={cn(
                  "w-full flex gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 last:border-b-0",
                  "hover:bg-accent focus-visible:outline-none focus-visible:bg-accent",
                  "min-h-[44px]",
                  !n.isRead && "bg-brand-500/[0.04]"
                )}
                aria-label={`${!n.isRead ? "Unread: " : ""}${n.title}`}
              >
                <span className="text-base shrink-0 mt-0.5 w-5 text-center" aria-hidden>
                  {TYPE_ICONS[n.type] ?? "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1.5">
                    <p
                      className={cn(
                        "text-xs leading-tight flex-1 line-clamp-1",
                        n.isRead ? "text-muted-foreground" : "font-semibold text-foreground"
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1"
                        aria-hidden
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
                    {n.body}
                  </p>
                  <time
                    className="text-[10px] text-muted-foreground/50 mt-1 block"
                    dateTime={new Date(n.createdAt).toISOString()}
                  >
                    {formatDateTime(n.createdAt)}
                  </time>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 p-2">
          <Link
            href={VIEW_ALL[portal]}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center justify-center gap-1.5 text-xs text-muted-foreground",
              "hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-accent w-full",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 min-h-[40px]"
            )}
          >
            View all notifications
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
