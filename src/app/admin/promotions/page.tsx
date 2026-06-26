import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import PromotionList from "@/components/admin/promotions/promotion-list"

export const dynamic = "force-dynamic"

export default async function PromotionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")

  const promotions = await prisma.promotion.findMany({
    include: {
      categories: { include: { category: { select: { id: true, name: true } } } },
      products:   { include: { product:  { select: { id: true, name: true } } } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promotions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage announcement bars, banners, popups, and campaigns
          </p>
        </div>
        <Button variant="brand" asChild>
          <Link href="/admin/promotions/new">
            <Plus className="h-4 w-4 mr-2" />
            New Promotion
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: promotions.length },
          { label: "Live",    value: promotions.filter((p) => {
              if (!p.isActive) return false
              const now = new Date()
              if (p.startsAt && new Date(p.startsAt) > now) return false
              if (p.endsAt   && new Date(p.endsAt)   < now) return false
              return true
            }).length },
          { label: "Scheduled", value: promotions.filter((p) => {
              if (!p.isActive) return false
              return p.startsAt && new Date(p.startsAt) > new Date()
            }).length },
          { label: "Impressions", value: promotions.reduce((s, p) => s + p.impressions, 0).toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border/50 bg-card p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold text-brand-400 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <PromotionList promotions={promotions as never} />
    </div>
  )
}
