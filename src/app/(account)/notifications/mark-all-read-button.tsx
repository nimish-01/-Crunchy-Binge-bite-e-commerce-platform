"use client"

import { Button } from "@/components/ui/button"
import { useNotifications } from "@/contexts/notification-context"
import { useRouter } from "next/navigation"

export default function MarkAllReadButton() {
  const { markAllRead } = useNotifications()
  const router = useRouter()
  return (
    <Button variant="outline" size="sm" onClick={async () => { await markAllRead(); router.refresh() }}>
      Mark all as read
    </Button>
  )
}
