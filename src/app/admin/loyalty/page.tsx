import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import LoyaltySettingsForm from "@/components/admin/loyalty/loyalty-settings-form"

export const metadata = { title: "Loyalty Settings — Admin" }

export default async function AdminLoyaltyPage() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/login")

  const [settings, stats] = await Promise.all([
    prisma.loyaltySettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    }),
    Promise.all([
      prisma.user.aggregate({ where: { role: "CUSTOMER", loyaltyPoints: { gt: 0 } }, _count: { id: true }, _sum: { loyaltyPoints: true } }),
      prisma.loyaltyTransaction.count({ where: { type: "PURCHASE" } }),
      prisma.loyaltyTransaction.count({ where: { type: "REDEEM" } }),
    ]),
  ])

  const [loyaltyStats, purchaseEarns, redeems] = stats

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Loyalty Programme</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Members with Points", value: loyaltyStats._count.id },
          { label: "Total Points Issued", value: loyaltyStats._sum.loyaltyPoints?.toLocaleString() ?? 0 },
          { label: "Earn Events",   value: purchaseEarns },
          { label: "Redeem Events", value: redeems },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <LoyaltySettingsForm settings={settings} />
    </div>
  )
}
