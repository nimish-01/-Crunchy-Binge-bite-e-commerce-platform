"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED"

const statusVariant: Record<ProductStatus, "success" | "secondary" | "destructive"> = {
  ACTIVE: "success",
  DRAFT: "secondary",
  ARCHIVED: "destructive",
}

const nextStatuses: Record<ProductStatus, ProductStatus[]> = {
  ACTIVE: ["DRAFT", "ARCHIVED"],
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["DRAFT", "ACTIVE"],
}

export default function ProductStatusToggle({ id, currentStatus }: { id: string; currentStatus: ProductStatus }) {
  const [status, setStatus] = useState<ProductStatus>(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function changeStatus(newStatus: ProductStatus) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!json.success) {
        toast({ title: json.error ?? "Failed to update status", variant: "destructive" })
        return
      }
      setStatus(newStatus)
      router.refresh()
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-0 gap-1" disabled={loading}>
          <Badge variant={statusVariant[status]} className="text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : status}
          </Badge>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {nextStatuses[status].map((s) => (
          <DropdownMenuItem key={s} onClick={() => changeStatus(s)}>
            Set to <Badge variant={statusVariant[s]} className="text-xs ml-1">{s}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
