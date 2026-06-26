"use client"

import { useState } from "react"
import { Star, Upload, X, Loader2 } from "lucide-react"

interface Props {
  productId: string
  onSuccess: () => void
}

export default function ReviewForm({ productId, onSuccess }: Props) {
  const [rating, setRating]       = useState(0)
  const [hovered, setHovered]     = useState(0)
  const [title, setTitle]         = useState("")
  const [body, setBody]           = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [images, setImages]       = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState("")

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    const res  = await fetch("/api/reviews/upload", { method: "POST", body: form })
    const data = await res.json()
    if (data.success) setImages((prev) => [...prev, data.url])
    else setError(data.error ?? "Upload failed")
    setUploading(false)
    e.target.value = ""
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError("Please select a rating"); return }
    setSubmitting(true)
    setError("")
    const res  = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title, body, images, videos: [], isAnonymous }),
    })
    const data = await res.json()
    if (data.success) {
      onSuccess()
    } else {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Failed to submit review. Please try again.",
      )
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
      <h3 className="font-semibold text-lg">Write a Review</h3>

      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium mb-2">Your Rating *</label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5 focus:outline-none"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  s <= (hovered || rating)
                    ? "fill-brand-500 text-brand-500"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" :
           rating === 4 ? "Very Good" : rating === 5 ? "Excellent" : "Click to rate"}
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Review Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Summarize your experience"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Your Review</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Tell others about your experience with this product..."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{body.length}/2000</p>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Add Photos (optional)</label>
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative h-16 w-16">
              <img src={url} alt="" className="h-full w-full object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="h-16 w-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-colors">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-0.5">Photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Anonymous */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="rounded border-border"
        />
        <span className="text-sm">Submit anonymously</span>
      </label>

      {error && (
        <div className="p-3 bg-red-500/10 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Only verified purchasers can leave reviews. Your review will be visible after moderation.
      </p>
    </form>
  )
}
