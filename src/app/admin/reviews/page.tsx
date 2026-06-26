import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Star } from "lucide-react"
import ReviewModerationActions from "@/components/admin/reviews/review-moderation-actions"

export const metadata = { title: "Reviews — Admin" }

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; search?: string }>
}) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/login")

  const { status, page: pageStr = "1", search = "" } = await searchParams
  const page  = parseInt(pageStr, 10)
  const limit = 20

  const where: Record<string, unknown> = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body:  { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [reviews, total, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where: where as never,
      include: {
        user:    { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: where as never }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ])

  const pages = Math.ceil(total / limit)

  const statuses = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-0.5">
              {pendingCount} review{pendingCount > 1 ? "s" : ""} pending moderation
            </p>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/reviews"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !status ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/reviews?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === s ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search review content..."
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Search
        </button>
      </form>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <Link href={`/products/${r.product.slug}`} className="font-medium text-sm hover:underline">
                    {r.product.name}
                  </Link>
                  <span className="text-muted-foreground text-xs">by {r.user.name ?? r.user.email}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    r.status === "APPROVED" ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                    r.status === "REJECTED" ? "bg-red-500/15 text-red-600 dark:text-red-400" :
                    r.status === "HIDDEN"   ? "bg-gray-500/15 text-gray-600 dark:text-gray-400" :
                    "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                  }`}>{r.status}</span>
                  {r.isFeatured && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/15 text-purple-600">Featured</span>}
                </div>
                {r.title && <p className="font-medium text-sm mb-1">{r.title}</p>}
                {r.body && <p className="text-sm text-muted-foreground line-clamp-3">{r.body}</p>}
                {r.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {r.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="h-12 w-12 object-cover rounded" />
                    ))}
                  </div>
                )}
                {r.adminResponse && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <span className="font-medium">Admin response: </span>{r.adminResponse}
                  </div>
                )}
              </div>
              <ReviewModerationActions reviewId={r.id} currentStatus={r.status} isFeatured={r.isFeatured} />
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No reviews found</div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?${new URLSearchParams({ ...(status ? { status } : {}), ...(search ? { search } : {}), page: String(p) }).toString()}`}
              className={`px-3 py-1 text-sm rounded border ${page === p ? "border-brand-500 text-brand-500" : "border-border hover:bg-muted"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
