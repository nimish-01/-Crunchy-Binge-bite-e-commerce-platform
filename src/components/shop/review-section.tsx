"use client"

import { useState, useEffect, useCallback } from "react"
import { Star, ThumbsUp, ThumbsDown, ChevronDown } from "lucide-react"
import ReviewForm from "./review-form"
import { useSession } from "next-auth/react"

interface Review {
  id: string
  rating: number
  title: string
  body: string
  images: string[]
  isAnonymous: boolean
  isFeatured: boolean
  status: string
  authorName: string
  authorImage: string | null
  helpfulCount: number
  notHelpfulCount: number
  createdAt: string
  adminResponse: string | null
}

interface ReviewData {
  reviews: Review[]
  total: number
  avgRating: number
  ratingDistribution: { rating: number; count: number }[]
  pagination: { pages: number }
}

interface Props {
  productId: string
  productSlug: string
}

export default function ReviewSection({ productId, productSlug }: Props) {
  const { data: session } = useSession()
  const [data, setData]       = useState<ReviewData | null>(null)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [myVotes, setMyVotes]   = useState<Record<string, boolean | null>>({})

  const load = useCallback(async (p: number) => {
    setLoading(true)
    const res = await fetch(`/api/reviews?productId=${productId}&page=${p}`)
    const d   = await res.json()
    if (d.success) setData(d)
    setLoading(false)
  }, [productId])

  useEffect(() => { load(page) }, [load, page])

  async function vote(reviewId: string, helpful: boolean) {
    if (!session?.user?.id) { window.location.href = "/login"; return }
    await fetch(`/api/reviews/${reviewId}/helpful`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful }),
    })
    setMyVotes((prev) => {
      const current = prev[reviewId]
      return { ...prev, [reviewId]: current === helpful ? null : helpful }
    })
    load(page)
  }

  if (!data && loading) {
    return (
      <div className="mt-16">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const { reviews = [], total = 0, avgRating = 0, ratingDistribution = [], pagination } = data ?? {}

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
          {total > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                ))}
              </div>
              <span className="font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">({total} reviews)</span>
            </div>
          )}
        </div>
        {session?.user?.id && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            {showForm ? "Cancel" : "Write a Review"}
          </button>
        )}
      </div>

      {/* Rating distribution */}
      {total > 0 && (
        <div className="mb-8 space-y-2">
          {ratingDistribution.map(({ rating, count }) => (
            <div key={rating} className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 w-8 justify-end">
                <span>{rating}</span>
                <Star className="h-3 w-3 fill-brand-500 text-brand-500" />
              </div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                />
              </div>
              <span className="w-6 text-right text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <div className="mb-8">
          <ReviewForm
            productId={productId}
            onSuccess={() => { setShowForm(false); load(1); setPage(1) }}
          />
        </div>
      )}

      {/* Reviews list */}
      {total === 0 && !showForm && (
        <div className="rounded-xl border border-border/50 bg-card py-12 text-center text-muted-foreground">
          <Star className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>No reviews yet</p>
          {session?.user?.id && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-brand-500 hover:underline"
            >
              Be the first to review
            </button>
          )}
        </div>
      )}

      <div className="space-y-5">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-border/50 bg-card p-5">
            {review.isFeatured && (
              <div className="flex items-center gap-1.5 text-xs text-purple-500 font-medium mb-2">
                <Star className="h-3.5 w-3.5 fill-purple-500" />
                Featured Review
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{review.authorName}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400">
                    Verified
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-brand-500 text-brand-500" : "text-muted-foreground"}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>

            {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
            {review.body && <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>}

            {review.images.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {review.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                    <img src={img} alt="" className="h-16 w-16 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}

            {review.adminResponse && (
              <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                <span className="font-medium text-brand-400">Store Response: </span>
                <span className="text-muted-foreground">{review.adminResponse}</span>
              </div>
            )}

            {/* Helpful votes */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Helpful?</span>
              <button
                onClick={() => vote(review.id, true)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  myVotes[review.id] === true
                    ? "bg-green-500/15 text-green-600"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {review.helpfulCount}
              </button>
              <button
                onClick={() => vote(review.id, false)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  myVotes[review.id] === false
                    ? "bg-red-500/15 text-red-600"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                {review.notHelpfulCount}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {(pagination?.pages ?? 1) > 1 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || page >= (pagination?.pages ?? 1)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  )
}
