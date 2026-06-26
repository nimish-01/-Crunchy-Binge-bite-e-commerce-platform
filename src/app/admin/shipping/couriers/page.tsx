import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus, Truck } from "lucide-react"
import { CourierManager } from "./courier-manager"

export default async function CouriersPage() {
  const couriers = await prisma.courier.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    include: { _count: { select: { shipments: true } } },
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Couriers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your courier partners and carriers</p>
        </div>
      </div>

      <CourierManager initialCouriers={couriers.map(c => ({
        id: c.id,
        name: c.name,
        website: c.website,
        trackingUrlPattern: c.trackingUrlPattern,
        supportPhone: c.supportPhone,
        supportEmail: c.supportEmail,
        logo: c.logo,
        isActive: c.isActive,
        priority: c.priority,
        shipmentCount: c._count.shipments,
      }))} />
    </div>
  )
}
