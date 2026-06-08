import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import AddressManager from "./address-manager"

export default async function AddressesPage() {
  const session = await auth()
  const addresses = await prisma.address.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Addresses</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your delivery addresses for faster checkout.
        </p>
      </div>
      <AddressManager initialAddresses={addresses} />
    </div>
  )
}
