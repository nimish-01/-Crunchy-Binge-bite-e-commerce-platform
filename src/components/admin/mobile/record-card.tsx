import Link from "next/link"
import { cn } from "@/lib/utils"
import ExpandableDetail from "@/components/admin/mobile/expandable-detail"

export interface RecordCardMeta {
  label: string
  value: React.ReactNode
}

interface RecordCardProps {
  href?: string
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  meta?: RecordCardMeta[]
  actions?: React.ReactNode
  details?: React.ReactNode
  detailsLabel?: string
  className?: string
}

export default function RecordCard({
  href,
  leading,
  title,
  subtitle,
  badge,
  meta,
  actions,
  details,
  detailsLabel,
  className,
}: RecordCardProps) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card p-4 space-y-3", className)}>
      <div className="flex items-start gap-3">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {href ? (
              <Link href={href} className="font-medium text-sm truncate block min-w-0 flex-1 hover:text-brand-400 transition-colors">
                {title}
              </Link>
            ) : (
              <div className="font-medium text-sm truncate min-w-0 flex-1">{title}</div>
            )}
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {meta && meta.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {meta.map((m) => (
            <div key={m.label} className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{m.label}</p>
              <div className="text-sm font-medium truncate">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {(actions || details) && (
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/40">
          <div className="flex items-center gap-1">{actions}</div>
          {details && <ExpandableDetail label={detailsLabel}>{details}</ExpandableDetail>}
        </div>
      )}
    </div>
  )
}
