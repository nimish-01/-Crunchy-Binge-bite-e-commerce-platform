"use client"

import { CheckCircle2, Circle, Clock } from "lucide-react"

interface TimelineEvent {
  id: string
  status: string
  title: string
  description?: string | null
  location?: string | null
  createdAt: Date | string
}

interface Props {
  events: TimelineEvent[]
  compact?: boolean
}

export function ShipmentTimeline({ events, compact = false }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No tracking events yet
      </div>
    )
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <ol className={`space-y-0 ${compact ? "" : ""}`} aria-label="Shipment timeline">
      {sorted.map((event, i) => {
        const isFirst = i === 0
        const isLast = i === sorted.length - 1
        const d = new Date(event.createdAt)
        const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

        return (
          <li key={event.id} className="relative flex gap-4">
            {/* Line */}
            {!isLast && (
              <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border/60" aria-hidden />
            )}

            {/* Icon */}
            <div className="relative z-10 mt-0.5 shrink-0">
              {isFirst ? (
                <div className="h-5 w-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-border bg-background flex items-center justify-center">
                  <Circle className="h-2.5 w-2.5 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={`pb-5 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className={`text-sm font-medium leading-tight ${isFirst ? "text-foreground" : "text-muted-foreground"}`}>
                    {event.title}
                  </p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">📍 {event.location}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 justify-end mt-0.5">
                    <Clock className="h-3 w-3" />
                    {timeStr}
                  </p>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
