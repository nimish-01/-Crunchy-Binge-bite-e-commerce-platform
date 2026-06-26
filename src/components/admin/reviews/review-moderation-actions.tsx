"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, EyeOff, Star, Trash2 } from "lucide-react"

interface Props {
  reviewId: string
  currentStatus: string
  isFeatured: boolean
}

export default function ReviewModerationActions({ reviewId, currentStatus, isFeatured }: Props) {
  const router = useRouter()
  const [loading, setLoading]     = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [reply, setReply]         = useState("")

  async function moderate(data: Record<string, unknown>) {
    setLoading(true)
    await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    router.refresh()
    setLoading(false)
  }

  async function deleteReview() {
    if (!confirm("Delete this review permanently?")) return
    setLoading(true)
    await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" })
    router.refresh()
    setLoading(false)
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault()
    await moderate({ adminResponse: reply })
    setShowReply(false)
    setReply("")
  }

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <div className="flex gap-1">
        <button
          onClick={() => moderate({ status: "APPROVED" })}
          disabled={loading || currentStatus === "APPROVED"}
          title="Approve"
          className="p-1.5 rounded hover:bg-green-500/15 text-green-600 disabled:opacity-30 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
        </button>
        <button
          onClick={() => moderate({ status: "REJECTED" })}
          disabled={loading || currentStatus === "REJECTED"}
          title="Reject"
          className="p-1.5 rounded hover:bg-red-500/15 text-red-600 disabled:opacity-30 transition-colors"
        >
          <XCircle className="h-4 w-4" />
        </button>
        <button
          onClick={() => moderate({ status: "HIDDEN" })}
          disabled={loading || currentStatus === "HIDDEN"}
          title="Hide"
          className="p-1.5 rounded hover:bg-gray-500/15 text-gray-600 disabled:opacity-30 transition-colors"
        >
          <EyeOff className="h-4 w-4" />
        </button>
        <button
          onClick={() => moderate({ isFeatured: !isFeatured })}
          disabled={loading}
          title={isFeatured ? "Unfeature" : "Feature"}
          className={`p-1.5 rounded transition-colors ${
            isFeatured ? "text-yellow-500 hover:bg-yellow-500/15" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Star className={`h-4 w-4 ${isFeatured ? "fill-yellow-500" : ""}`} />
        </button>
        <button
          onClick={deleteReview}
          disabled={loading}
          title="Delete"
          className="p-1.5 rounded hover:bg-red-500/15 text-red-600 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={() => setShowReply(!showReply)}
        className="text-xs text-brand-500 hover:underline text-left"
      >
        {showReply ? "Cancel" : "Reply"}
      </button>
      {showReply && (
        <form onSubmit={submitReply} className="flex flex-col gap-1.5 w-48">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Admin response..."
            rows={3}
            className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background resize-none"
          />
          <button
            type="submit"
            className="py-1 text-xs bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            Save Reply
          </button>
        </form>
      )}
    </div>
  )
}
