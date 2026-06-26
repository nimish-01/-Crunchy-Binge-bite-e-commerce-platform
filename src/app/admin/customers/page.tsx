import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api-auth"
import { isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, ShoppingBag, Star, Wallet } from "lucide-react"

export const metadata = { title: "Customers — Admin" }

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/login")

  const { search = "", page: pageStr = "1", status } = await searchParams
  const page  = parseInt(pageStr, 10)
  const limit = 20

  const where: Record<string, unknown> = {
    role: "CUSTOMER",
    ...(search
      ? {
          OR: [
            { name:  { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status === "active"    ? { isActive: true }  : {}),
    ...(status === "suspended" ? { isActive: false } : {}),
  }

  const [customers, total, stats] = await Promise.all([
    prisma.user.findMany({
      where: where as never,
      select: {
        id:           true,
        name:         true,
        email:        true,
        phone:        true,
        isActive:     true,
        loyaltyPoints: true,
        loyaltyTier:  true,
        createdAt:    true,
        _count: { select: { orders: true, reviews: true } },
        wallet: { select: { balance: true } },
        orders: { where: { status: "DELIVERED" }, select: { subtotal: true }, take: 200 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where: where as never }),
    Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "CUSTOMER", isActive: true } }),
      prisma.wallet.aggregate({ _sum: { balance: true } }),
    ]),
  ])

  const [totalCustomers, activeCustomers, walletAgg] = stats
  const totalWalletIssued = walletAgg._sum.balance ?? 0
  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: totalCustomers, icon: Users, color: "text-blue-500" },
          { label: "Active", value: activeCustomers, icon: ShoppingBag, color: "text-green-500" },
          { label: "Suspended", value: totalCustomers - activeCustomers, icon: Users, color: "text-red-500" },
          { label: "Wallet Issued", value: `₹${totalWalletIssued.toFixed(0)}`, icon: Wallet, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name, email, phone..."
          className="flex-1 min-w-48 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Customer", "Contact", "Orders", "Spent", "Loyalty", "Wallet", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((c) => {
              const totalSpent = c.orders.reduce((sum, o) => sum + o.subtotal, 0)
              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs">{c.email}</p>
                    <p className="text-xs text-muted-foreground">{c.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{c._count.orders}</td>
                  <td className="px-4 py-3">₹{totalSpent.toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.loyaltyPoints}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{c.loyaltyTier}</span>
                  </td>
                  <td className="px-4 py-3">₹{(c.wallet?.balance ?? 0).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.isActive
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}>
                      {c.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="text-xs text-brand-500 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?search=${search}&status=${status ?? ""}&page=${page - 1}`}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < pages && (
              <Link
                href={`?search=${search}&status=${status ?? ""}&page=${page + 1}`}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
