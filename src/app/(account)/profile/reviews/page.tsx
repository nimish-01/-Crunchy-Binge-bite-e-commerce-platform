import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Star } from "lucide-react"
import Link from "next/link"
import CustomerReviewActions from "@/components/shop/customer-review-actions"

export const metadata = { title: "My Reviews — Crunchy Bingebite" }

export default async function MyReviewsPage() {
  const session = await auth()

  const reviews = await prisma.review.findMany({
    where: { userId: session!.user.id },
    include: { product: { select: { name: true, slug: true, images: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Reviews</h1>

      {reviews.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-card py-16 text-center">
          <Star className="h-8 w-8 mx-auto mb-3 opacity-40 text-muted-foreground" />
          <p className="text-muted-foreground">You haven&apos;t written any reviews yet</p>
          <Link href="/products" className="mt-3 inline-block text-sm text-brand-500 hover:underline">
            Browse products to review
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-start gap-4">
              {review.product.images[0] && (
                <img
                  src={review.product.images[0]}
                  alt={review.product.name}
                  className="h-16 w-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/products/${review.product.slug}`} className="font-medium hover:underline">
                  {review.product.name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    review.status === "APPROVED" ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                    review.status === "REJECTED" ? "bg-red-500/15 text-red-600 dark:text-red-400" :
                    "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                  }`}>{review.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {review.title && <p className="font-medium text-sm mt-2">{review.title}</p>}
                {review.body && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{review.body}</p>}
                {review.adminResponse && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <span className="font-medium">Admin response: </span>{review.adminResponse}
                  </div>
                )}
              </div>
              <CustomerReviewActions reviewId={review.id} status={review.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
