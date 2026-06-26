import { prisma } from "@/lib/prisma"
import { RatesManager } from "./rates-manager"

export default async function ShippingRatesPage() {
  const [rates, couriers] = await Promise.all([
    prisma.shippingRate.findMany({
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      include: { courier: { select: { id: true, name: true } } },
    }),
    prisma.courier.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Shipping Rates</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure flat, weight-based, or order value based rates</p>
      </div>
      <RatesManager initialRates={rates.map(r => ({ ...r, courierName: r.courier?.name ?? null }))} couriers={couriers} />
    </div>
  )
}
