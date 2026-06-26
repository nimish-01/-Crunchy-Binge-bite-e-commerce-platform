"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { ZoomIn, X, ChevronLeft, ChevronRight, Play } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface GalleryItem {
  id: string
  type: "image" | "video"
  url: string
  thumb: string
  alt: string
}

interface Props {
  items: GalleryItem[]
  productName: string
  isFeatured?: boolean
}

export default function ProductGallery({ items, productName, isFeatured }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? items.length - 1 : i - 1))
  }, [items.length])

  const next = useCallback(() => {
    setActiveIndex((i) => (i === items.length - 1 ? 0 : i + 1))
  }, [items.length])

  if (items.length === 0) {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-border/50">
        <div className="w-full h-full flex items-center justify-center text-8xl">🌾</div>
        {isFeatured && (
          <div className="absolute top-4 left-4">
            <Badge variant="brand">Bestseller</Badge>
          </div>
        )}
      </div>
    )
  }

  const current = items[activeIndex]

  return (
    <div className="space-y-3">
      {/* Main viewer */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-border/50 group">
        {current.type === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="w-full h-full object-contain"
            poster={current.thumb}
          />
        ) : (
          <>
            <Image
              src={current.url}
              alt={current.alt || productName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] cursor-zoom-in"
              priority={activeIndex === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
              onClick={() => setFullscreen(true)}
            />
            <button
              onClick={() => setFullscreen(true)}
              aria-label="View fullscreen"
              className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </>
        )}

        {isFeatured && (
          <div className="absolute top-4 left-4 pointer-events-none">
            <Badge variant="brand">Bestseller</Badge>
          </div>
        )}

        {items.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border-2 transition-colors",
                i === activeIndex
                  ? "border-brand-500"
                  : "border-transparent hover:border-border/60"
              )}
            >
              <Image
                src={item.thumb}
                alt={item.alt || productName}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
              {item.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Play className="h-4 w-4 text-white fill-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen dialog — images only */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden bg-zinc-950 border-zinc-800 gap-0">
          {/* Close */}
          <button
            onClick={() => setFullscreen(false)}
            aria-label="Close fullscreen"
            className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Main image */}
          <div className="relative w-full" style={{ minHeight: "60vh" }}>
            <Image
              src={current.url}
              alt={current.alt || productName}
              fill
              className="object-contain"
              sizes="90vw"
            />
            {items.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={next}
                  aria-label="Next"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip in fullscreen */}
          {items.length > 1 && (
            <div className="flex gap-2 p-4 justify-center bg-zinc-900/70 overflow-x-auto">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "relative w-12 h-12 rounded-md overflow-hidden border-2 shrink-0 transition-all",
                    i === activeIndex
                      ? "border-brand-500"
                      : "border-transparent opacity-50 hover:opacity-100"
                  )}
                >
                  <Image src={item.thumb} alt="" fill className="object-cover" sizes="48px" unoptimized />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
