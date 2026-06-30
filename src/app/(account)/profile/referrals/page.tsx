import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Users2, CheckCircle, Clock } from "lucide-react"
import ReferralShare from "@/components/shop/referral-share"

export const metadata = { title: "Referrals — Crunchy Bingebite" }

export default async function ReferralsPage() {
  const session = await auth()

  const [user, referrals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { referralCode: true, name: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: session!.user.id },
      include: { referee: { select: { name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://bingebite.in"
  const referralLink = `${baseUrl}?ref=${user?.referralCode}`
  const completed = referrals.filter((r) => r.status === "COMPLETED").length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Refer &amp; Earn</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Referrals", value: referrals.length, color: "text-foreground" },
          { label: "Completed",       value: completed,        color: "text-green-500" },
          { label: "Pending",         value: referrals.length - completed, color: "text-yellow-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Share section */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users2 className="h-4 w-4 text-brand-400" />
          Your Referral Link
        </h2>
        <ReferralShare referralCode={user?.referralCode ?? ""} referralLink={referralLink} />
        <p className="text-xs text-muted-foreground mt-3">
          You earn points when your friend places their first order. They get bonus points too!
        </p>
      </div>

      {/* Referral list */}
      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-5 border-b border-border/50">
          <h2 className="font-semibold">Referral History</h2>
        </div>
        <div className="divide-y divide-border/50">
          {referrals.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4">
              <div className={`p-2 rounded-full ${r.status === "COMPLETED" ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                {r.status === "COMPLETED"
                  ? <CheckCircle className="h-4 w-4 text-green-500" />
                  : <Clock className="h-4 w-4 text-yellow-500" />
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.referee.name ?? r.referee.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(r.referee.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                r.status === "COMPLETED"
                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
              }`}>
                {r.status}
              </span>
            </div>
          ))}
          {referrals.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Users2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>No referrals yet</p>
              <p className="text-sm mt-1">Share your link to start earning</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
