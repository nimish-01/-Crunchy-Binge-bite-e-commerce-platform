"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

interface Props {
  reviewId: string
  status: string
}

export default function CustomerReviewActions({ reviewId, status }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function deleteReview() {
    if (!confirm("Delete this review?")) return
    setLoading(true)
    await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" })
    router.refresh()
    setLoading(false)
  }

  if (status === "REJECTED") return null

  return (
    <button
      onClick={deleteReview}
      disabled={loading}
      title="Delete review"
      className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
