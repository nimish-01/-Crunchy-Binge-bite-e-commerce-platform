import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import MarkAllReadButton from "./mark-all-read-button"

export default async function NotificationsPage() {
  const session = await auth()
  const notifications = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.isRead) && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-xl border p-4 transition-colors ${n.isRead ? "border-border/30 bg-card/50" : "border-brand-500/30 bg-brand-500/5"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{n.title}</p>
                    {!n.isRead && <Badge variant="brand" className="text-xs">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{formatDateTime(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
