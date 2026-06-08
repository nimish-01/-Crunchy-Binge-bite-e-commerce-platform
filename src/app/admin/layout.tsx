import { headers } from "next/headers"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "@/components/layout/admin-sidebar"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""

  // Login page lives under /admin but must not be behind the auth gate
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  const session = await auth()
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/admin/login")
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
