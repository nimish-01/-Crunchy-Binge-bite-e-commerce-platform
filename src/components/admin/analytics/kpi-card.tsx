import { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Props {
  title:     string
  value:     string | number
  subtitle?: string
  trend?:    number // percentage change
  icon?:     LucideIcon
  color?:    string // tailwind color class for icon
  prefix?:   string
  suffix?:   string
}

export default function KpiCard({ title, value, subtitle, trend, icon: Icon, color = "text-brand-400", prefix = "", suffix = "" }: Props) {
  const displayValue = typeof value === "number"
    ? value >= 1000
      ? `${prefix}${(value / 1000).toFixed(1)}K${suffix}`
      : `${prefix}${value.toFixed(0)}${suffix}`
    : `${prefix}${value}${suffix}`

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        {Icon && <Icon className={`h-4 w-4 ${color}`} />}
      </div>
      <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
          trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
        }`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs prev period
        </div>
      )}
    </div>
  )
}
