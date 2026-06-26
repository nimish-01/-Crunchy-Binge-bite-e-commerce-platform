import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Sparkles } from "lucide-react"
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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Website Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage company info, social links, footer text, and business details.
          </p>
        </div>
        <Link
          href="/admin/settings/delivery-page"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-500/30 bg-brand-500/5 hover:bg-brand-500/10 text-sm font-medium text-brand-400 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Order Success Page
        </Link>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
