"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

export default function InventoryHistoryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const createURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "ALL") {
          params.delete(key)
        } else {
          params.set(key, value)
          if (key !== "page") params.delete("page")
        }
      }
      return `${pathname}?${params.toString()}`
    },
    [pathname, searchParams]
  )

  const q = searchParams.get("q") ?? ""
  const updateType = searchParams.get("updateType") ?? "ALL"
  const reason = searchParams.get("reason") ?? "ALL"
  const hasFilters = q || updateType !== "ALL" || reason !== "ALL"

  function handleSearchChange(value: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.replace(createURL({ q: value }), { scroll: false })
    }, 300)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          key={q}
          placeholder="Search by product name…"
          className="pl-9"
          defaultValue={q}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Select
        value={updateType}
        onValueChange={(v) => router.replace(createURL({ updateType: v }), { scroll: false })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Actions</SelectItem>
          <SelectItem value="ADD">Received</SelectItem>
          <SelectItem value="REMOVE">Removed</SelectItem>
          <SelectItem value="SET">Adjusted</SelectItem>
          <SelectItem value="DAMAGED">Damaged</SelectItem>
          <SelectItem value="EXPIRED">Expired</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={reason}
        onValueChange={(v) => router.replace(createURL({ reason: v }), { scroll: false })}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Reason" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Reasons</SelectItem>
          <SelectItem value="STOCK_RECEIVED">Stock Received</SelectItem>
          <SelectItem value="MANUAL_ADJUSTMENT">Manual Adjustment</SelectItem>
          <SelectItem value="DAMAGED">Damaged</SelectItem>
          <SelectItem value="RETURNED">Returned</SelectItem>
          <SelectItem value="ORDER_CANCELLED">Order Cancelled</SelectItem>
          <SelectItem value="INITIAL_STOCK">Initial Stock</SelectItem>
          <SelectItem value="ORDER_PLACED">Order Placed</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />Clear
        </Button>
      )}
    </div>
  )
}
