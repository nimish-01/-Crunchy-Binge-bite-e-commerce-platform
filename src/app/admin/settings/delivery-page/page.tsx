import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Settings2 } from "lucide-react"
import DeliveryPageSettingsForm from "./delivery-page-settings-form"

export const metadata = { title: "Order Success Page Settings — Admin" }

export default async function DeliveryPageSettingsPage() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  const settings = await prisma.siteSettings.upsert({
    where:  { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-brand-400" />
            Order Success Page Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize the celebration shown when a customer places an order
          </p>
        </div>
      </div>

      <DeliveryPageSettingsForm settings={settings} />
    </div>
  )
}
