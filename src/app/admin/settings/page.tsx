import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SettingsForm from "./settings-form"

export default async function AdminSettingsPage() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin")

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Website Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage company info, social links, footer text, and business details.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
