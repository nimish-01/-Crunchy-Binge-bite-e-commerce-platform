import { prisma } from "@/lib/prisma"
import { ZoneManager } from "./zone-manager"

export default async function DeliveryZonesPage() {
  const zones = await prisma.deliveryZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Delivery Zones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define serviceable areas with PIN codes, charges, and delivery estimates
        </p>
      </div>
      <ZoneManager initialZones={zones} />
    </div>
  )
}
