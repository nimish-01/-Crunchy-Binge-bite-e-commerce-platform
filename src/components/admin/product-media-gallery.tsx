"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Star, Trash2, ArrowUp, ArrowDown, ImageOff, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import MediaPicker from "@/components/admin/media-picker"
import type { MediaAsset } from "@prisma/client"

interface MediaItem {
  id: string
  sortOrder: number
  isThumbnail: boolean
  mediaAsset: {
    id: string
    secureUrl: string
    thumbnailUrl: string | null
    resourceType: string
    altText: string | null
    publicId: string
  }
}

interface Props {
  productId: string
}

export default function ProductMediaGallery({ productId }: Props) {
  const { toast } = useToast()
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchMedia = useCallback(async () => {
    const res = await fetch(`/api/admin/products/${productId}/media`)
    if (res.ok) {
      const json = await res.json()
      setMedia(json.media)
    }
    setLoading(false)
  }, [productId])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  async function handleAdd(asset: MediaAsset) {
    setSaving(true)
    const res = await fetch(`/api/admin/products/${productId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaAssetId: asset.id }),
    })
    const json = await res.json()
    setSaving(false)
    if (!json.success) {
      toast({ title: "Failed to add media", description: json.error, variant: "destructive" })
      return
    }
    await fetchMedia()
    toast({ title: "Media added" })
  }

  async function handleSetThumbnail(id: string) {
    const res = await fetch(`/api/admin/products/${productId}/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isThumbnail: true }),
    })
    if (res.ok) {
      setMedia((m) => m.map((x) => ({ ...x, isThumbnail: x.id === id })))
      toast({ title: "Thumbnail updated" })
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/products/${productId}/media/${id}`, { method: "DELETE" })
    if (res.ok) {
      await fetchMedia()
      toast({ title: "Removed from gallery" })
    }
  }

  async function handleReorder(next: MediaItem[]) {
    const ordered = next.map((x, i) => ({ ...x, sortOrder: i }))
    setMedia(ordered)
    await fetch(`/api/admin/products/${productId}/media/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: ordered.map((x) => ({ id: x.id, sortOrder: x.sortOrder })) }),
    })
  }

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...media]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    handleReorder(next)
  }

  function moveDown(index: number) {
    if (index === media.length - 1) return
    const next = [...media]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    handleReorder(next)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Product Media Gallery</CardTitle>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <MediaPicker
            onSelect={handleAdd}
            trigger={
              <Button size="sm" variant="outline" type="button">
                Add Media
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading gallery…</span>
          </div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground border border-dashed border-border/50 rounded-lg">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">No media yet — click Add Media to get started</p>
            <p className="text-xs opacity-60">Supports images and videos from your media library</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((item, i) => {
              const thumb = item.mediaAsset.thumbnailUrl ?? item.mediaAsset.secureUrl
              const isVideo = item.mediaAsset.resourceType === "video"
              return (
                <div
                  key={item.id}
                  className={`relative group rounded-lg overflow-hidden bg-zinc-900 border-2 transition-colors ${
                    item.isThumbnail ? "border-brand-500" : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={thumb}
                      alt={item.mediaAsset.altText ?? ""}
                      fill
                      className="object-cover"
                      sizes="180px"
                      unoptimized
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-8 w-8 rounded-full bg-black/60 flex items-center justify-center">
                          <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                    {item.isThumbnail && (
                      <div className="absolute top-1.5 left-1.5 pointer-events-none">
                        <span className="text-[10px] bg-brand-500 text-zinc-950 font-bold px-1.5 py-0.5 rounded">THUMB</span>
                      </div>
                    )}
                  </div>

                  {/* Hover action bar */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetThumbnail(item.id)}
                      title="Set as thumbnail"
                      className="h-7 w-7 rounded-md bg-white/15 hover:bg-brand-500 flex items-center justify-center text-white transition-colors"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      title="Move left"
                      className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/35 flex items-center justify-center text-white transition-colors disabled:opacity-25"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      disabled={i === media.length - 1}
                      title="Move right"
                      className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/35 flex items-center justify-center text-white transition-colors disabled:opacity-25"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="Remove"
                      className="h-7 w-7 rounded-md bg-white/15 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          ★ Set thumbnail · ↑↓ Reorder · 🗑 Remove — hover a tile to see actions
        </p>
      </CardContent>
    </Card>
  )
}
