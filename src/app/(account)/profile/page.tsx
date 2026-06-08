import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { getInitials } from "@/lib/utils"

export default async function ProfilePage() {
  const session = await auth()
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { orders: true, wishlists: true, reviews: true } },
    },
  })
  if (!user) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-brand-500 flex items-center justify-center text-xl font-bold text-zinc-950">
                {getInitials(user.name ?? user.email ?? "U")}
              </div>
              <div>
                <p className="text-xl font-semibold">{user.name ?? "—"}</p>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-brand-400 border-brand-500/30 capitalize">
                    {user.loyaltyTier}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Member since {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{user._count.orders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Binge Points</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-brand-400">{user.loyaltyPoints}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Referral Code</CardTitle></CardHeader>
          <CardContent>
            <p className="font-mono font-bold text-sm text-brand-400 bg-brand-500/10 px-3 py-1 rounded-md">
              {user.referralCode.slice(0, 8).toUpperCase()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
