"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"

const PERIODS = [
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d",        label: "7 Days" },
  { value: "30d",       label: "30 Days" },
  { value: "90d",       label: "90 Days" },
  { value: "year",      label: "This Year" },
]

interface Props {
  current?: string
}

export default function DateFilter({ current = "30d" }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const onChange = useCallback((period: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", period)
    params.delete("startDate")
    params.delete("endDate")
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  return (
    <div className="flex gap-1 flex-wrap">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            current === p.value
              ? "bg-brand-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
