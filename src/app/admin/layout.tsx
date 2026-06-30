import { headers } from "next/headers"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "@/components/layout/admin-sidebar"
import AdminMobileHeader from "@/components/layout/admin-mobile-header"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  const session = await auth()
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    redirect("/admin/login")
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <AdminMobileHeader />
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px]">{children}</div>
      </main>
    </div>
  )
}
