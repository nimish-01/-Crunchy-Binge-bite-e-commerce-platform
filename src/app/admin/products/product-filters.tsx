"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import type { Category } from "@/types"

interface Props {
  categories: Category[]
}

export default function ProductFilters({ categories }: Props) {
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
  const status = searchParams.get("status") ?? "ALL"
  const categoryId = searchParams.get("categoryId") ?? "ALL"
  const hasFilters = q || status !== "ALL" || categoryId !== "ALL"

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
          placeholder="Search products…"
          className="pl-9"
          defaultValue={q}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Select
        value={status}
        onValueChange={(v) => router.replace(createURL({ status: v }), { scroll: false })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={categoryId}
        onValueChange={(v) => router.replace(createURL({ categoryId: v }), { scroll: false })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4" />Clear
        </Button>
      )}
    </div>
  )
}
