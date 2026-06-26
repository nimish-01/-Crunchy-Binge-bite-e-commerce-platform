import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AccountNav from "./account-nav"

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <>
      <Header />
      <div className="container py-8 sm:py-12">
        {/* Mobile horizontal nav */}
        <AccountNav mobile />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <AccountNav />
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  )
}
