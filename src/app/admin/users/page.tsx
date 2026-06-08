import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import { ChevronRight, RotateCcw, Search } from "lucide-react"
import Link from "next/link"
import type { UserRole } from "@prisma/client"
import { UserActionsMenu } from "./user-actions"

const PAGE_SIZE = 20

const ROLE_COLORS: Record<UserRole, "default" | "secondary" | "destructive" | "brand" | "success" | "warning" | "outline"> = {
  SUPER_ADMIN: "destructive",
  ADMIN: "brand",
  INVENTORY_MANAGER: "warning",
  CUSTOMER: "secondary",
}

interface Props { searchParams: Promise<{ q?: string; role?: string; status?: string; after?: string }> }

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth()
  const currentUserId = session?.user?.id ?? ""

  const { q, role, status, after } = await searchParams

  const where = {
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(role ? { role: role as UserRole } : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
  }

  const raw = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(after ? { cursor: { id: after }, skip: 1 } : {}),
  })

  const hasNextPage = raw.length > PAGE_SIZE
  const users = raw.slice(0, PAGE_SIZE)
  const nextCursor = hasNextPage ? users[users.length - 1].id : null

  function baseHref(overrides: Record<string, string | undefined> = {}) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (role) params.set("role", role)
    if (status) params.set("status", status)
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    const s = params.toString()
    return "/admin/users" + (s ? "?" + s : "")
  }

  const ROLES: UserRole[] = ["CUSTOMER", "INVENTORY_MANAGER", "ADMIN", "SUPER_ADMIN"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <span className="text-sm text-muted-foreground">{users.length} shown</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" action="/admin/users" className="relative">
          {role && <input type="hidden" name="role" value={role} />}
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="pl-8 w-56"
          />
        </form>

        <div className="flex flex-wrap gap-1.5">
          {["", ...ROLES].map((r) => (
            <Button key={r} variant={role === r || (!role && !r) ? "brand" : "outline"} size="sm" asChild>
              <Link href={baseHref({ role: r || undefined, after: undefined })}>{r || "All Roles"}</Link>
            </Button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {[["", "All"], ["active", "Active"], ["inactive", "Inactive"]].map(([val, label]) => (
            <Button key={val} variant={status === val || (!status && !val) ? "brand" : "outline"} size="sm" asChild>
              <Link href={baseHref({ status: val || undefined, after: undefined })}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No users found</td>
              </TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{user.name ?? <span className="text-muted-foreground italic">No name</span>}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_COLORS[user.role]} className="text-xs">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "destructive"} className="text-xs">
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{user._count.orders}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                <TableCell>
                  <UserActionsMenu
                    userId={user.id}
                    currentRole={user.role}
                    isActive={user.isActive}
                    isSelf={user.id === currentUserId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {users.length} user{users.length !== 1 ? "s" : ""}</span>
        <div className="flex gap-2">
          {after && (
            <Button variant="outline" size="sm" asChild>
              <Link href={baseHref({ after: undefined })}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />First Page</Link>
            </Button>
          )}
          {nextCursor && (
            <Button variant="outline" size="sm" asChild>
              <Link href={baseHref({ after: nextCursor })}>
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
