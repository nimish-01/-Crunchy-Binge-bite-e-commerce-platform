import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from "date-fns"

export type AnalyticsPeriod = "today" | "yesterday" | "7d" | "30d" | "90d" | "year" | "custom"

export interface DateRange {
  start: Date
  end: Date
  label: string
  bucket: "hour" | "day" | "week" | "month"
}

export function getDateRange(
  period: AnalyticsPeriod = "30d",
  startDate?: string | null,
  endDate?: string | null,
): DateRange {
  const now = new Date()
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: now, label: "Today", bucket: "hour" }
    case "yesterday": {
      const y = subDays(now, 1)
      return { start: startOfDay(y), end: endOfDay(y), label: "Yesterday", bucket: "hour" }
    }
    case "7d":
      return { start: startOfDay(subDays(now, 6)), end: now, label: "Last 7 Days", bucket: "day" }
    case "30d":
      return { start: startOfDay(subDays(now, 29)), end: now, label: "Last 30 Days", bucket: "day" }
    case "90d":
      return { start: startOfDay(subDays(now, 89)), end: now, label: "Last 90 Days", bucket: "day" }
    case "year":
      return { start: startOfYear(now), end: now, label: "This Year", bucket: "month" }
    case "custom": {
      const s = startDate ? new Date(startDate) : subDays(now, 29)
      const e = endDate   ? new Date(endDate)   : now
      const days = Math.ceil((e.getTime() - s.getTime()) / 86400000)
      return { start: s, end: e, label: "Custom", bucket: days <= 2 ? "hour" : days <= 90 ? "day" : "month" }
    }
    default:
      return { start: startOfDay(subDays(now, 29)), end: now, label: "Last 30 Days", bucket: "day" }
  }
}

export function parsePeriod(searchParams: URLSearchParams): DateRange {
  const period = (searchParams.get("period") ?? "30d") as AnalyticsPeriod
  return getDateRange(period, searchParams.get("startDate"), searchParams.get("endDate"))
}

// Convert BigInt to number for JSON serialization
export function toNum(v: unknown): number {
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "number") return v
  if (typeof v === "string") return parseFloat(v) || 0
  return 0
}
