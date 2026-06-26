"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Pencil, Trash2, Copy, Eye, EyeOff, Loader2,
  Megaphone, Image as ImageIcon, ShoppingBag, Tag, Layers,
  MousePointerClick, Timer, BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface Promotion {
  id: string
  name: string
  type: string
  isActive: boolean
  priority: number
  startsAt: Date | null
  endsAt: Date | null
  impressions: number
  clicks: number
  audienceTarget: string
  displayPages: string[]
  categories: { category: { id: string; name: string } }[]
  products:   { product:  { id: string; name: string } }[]
}

const TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ANNOUNCEMENT_BAR: Megaphone,
  HOMEPAGE_BANNER:  ImageIcon,
  CATEGORY_BANNER:  Tag,
  PRODUCT_BANNER:   ShoppingBag,
  POPUP:            Layers,
  FLOATING_BUTTON:  MousePointerClick,
  COUNTDOWN_CAMPAIGN: Timer,
}

const TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT_BAR: "Announcement Bar",
  HOMEPAGE_BANNER:  "Homepage Banner",
  CATEGORY_BANNER:  "Category Banner",
  PRODUCT_BANNER:   "Product Banner",
  POPUP:            "Popup",
  FLOATING_BUTTON:  "Floating Button",
  COUNTDOWN_CAMPAIGN: "Countdown",
}

function promoStatus(p: Promotion) {
  if (!p.isActive) return { label: "Disabled", variant: "secondary" as const }
  const now = new Date()
  if (p.startsAt && new Date(p.startsAt) > now) return { label: "Scheduled", variant: "outline" as const }
  if (p.endsAt   && new Date(p.endsAt)   < now) return { label: "Expired",   variant: "destructive" as const }
  return { label: "Live", variant: "brand" as const }
}

interface Props {
  promotions: Promotion[]
}

export default function PromotionList({ promotions: initial }: Props) {
  const [promotions, setPromotions] = useState(initial)
  const [acting, setActing]         = useState<string | null>(null)
  const router  = useRouter()
  const { toast } = useToast()

  async function handleToggle(id: string) {
    setActing(id)
    const res  = await fetch(`/api/admin/promotions/${id}/toggle`, { method: "PATCH" })
    const json = await res.json()
    if (json.success) {
      setPromotions((prev) =>
        prev.map((p) => p.id === id ? { ...p, isActive: json.promotion.isActive } : p)
      )
      toast({ title: "Promotion updated" })
    } else {
      toast({ title: "Failed", variant: "destructive" })
    }
    setActing(null)
  }

  async function handleDuplicate(id: string) {
    setActing(id)
    const res  = await fetch(`/api/admin/promotions/${id}/duplicate`, { method: "POST" })
    const json = await res.json()
    setActing(null)
    if (json.success) {
      toast({ title: "Duplicated" })
      router.refresh()
    } else {
      toast({ title: "Duplicate failed", variant: "destructive" })
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setActing(id)
    const res  = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) {
      setPromotions((prev) => prev.filter((p) => p.id !== id))
      toast({ title: "Deleted" })
    } else {
      toast({ title: "Delete failed", variant: "destructive" })
    }
    setActing(null)
  }

  if (promotions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Megaphone className="h-10 w-10 opacity-30" />
          <p className="text-sm">No promotions yet — create your first campaign above.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {promotions.map((p) => {
        const status = promoStatus(p)
        const Icon   = TYPE_ICONS[p.type] ?? Megaphone
        const ctr    = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(1) : "0.0"
        const isLoading = acting === p.id

        return (
          <Card key={p.id} className="hover:border-brand-500/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-brand-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{p.name}</p>
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                    <Badge variant="secondary" className="text-xs">{TYPE_LABELS[p.type] ?? p.type}</Badge>
                    {p.priority > 0 && (
                      <Badge variant="outline" className="text-xs">P{p.priority}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {p.impressions.toLocaleString()} imp · {p.clicks.toLocaleString()} clicks · {ctr}% CTR
                    </span>
                    {p.audienceTarget !== "ALL_VISITORS" && (
                      <span>{p.audienceTarget.replace(/_/g, " ")}</span>
                    )}
                    {p.displayPages.length > 0 && (
                      <span>{p.displayPages.join(", ")}</span>
                    )}
                    {p.startsAt && (
                      <span>From {new Date(p.startsAt).toLocaleDateString()}</span>
                    )}
                    {p.endsAt && (
                      <span>Until {new Date(p.endsAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {(p.categories.length > 0 || p.products.length > 0) && (
                    <div className="flex gap-1 flex-wrap">
                      {p.categories.slice(0, 3).map((c) => (
                        <span key={c.category.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {c.category.name}
                        </span>
                      ))}
                      {p.products.slice(0, 3).map((pr) => (
                        <span key={pr.product.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {pr.product.name}
                        </span>
                      ))}
                      {(p.categories.length + p.products.length) > 6 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          +{p.categories.length + p.products.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => handleToggle(p.id)}
                        title={p.isActive ? "Disable" : "Enable"}
                      >
                        {p.isActive
                          ? <Eye className="h-3.5 w-3.5 text-brand-400" />
                          : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Edit">
                        <Link href={`/admin/promotions/${p.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => handleDuplicate(p.id)}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className={cn("h-8 w-8 hover:text-destructive hover:bg-destructive/10")}
                        onClick={() => handleDelete(p.id, p.name)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
