import { headers } from "next/headers"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import InventorySidebar from "@/components/layout/inventory-sidebar"

export const dynamic = "force-dynamic"

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""

  // Login page lives under /inventory but must not be behind the auth gate
  if (pathname === "/inventory/login") {
    return <>{children}</>
  }

  const session = await auth()
  const allowed = ["INVENTORY_MANAGER", "ADMIN", "SUPER_ADMIN"]
  if (!session || !allowed.includes(session.user.role)) {
    redirect("/inventory/login")
  }

  return (
    <div className="flex min-h-screen">
      <InventorySidebar />
      <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  )
}
