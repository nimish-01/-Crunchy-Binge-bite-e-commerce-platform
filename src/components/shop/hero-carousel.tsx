"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HeroSlide, MediaAsset } from "@prisma/client"

type SlideWithMedia = HeroSlide & { media: MediaAsset | null }

interface Props {
  slides: SlideWithMedia[]
}

function SlideMedia({ media, heading }: { media: MediaAsset; heading: string }) {
  if (media.resourceType === "video") {
    return (
      <video
        src={media.secureUrl}
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        autoPlay
        muted
        loop
        playsInline
      />
    )
  }
  return (
    <Image
      src={media.secureUrl}
      alt={media.altText || heading}
      fill
      className="object-cover opacity-50"
      priority
      sizes="100vw"
    />
  )
}

export default function HeroCarousel({ slides }: Props) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const multiple = slides.length > 1

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length]
  )
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length)

  useEffect(() => {
    if (!multiple || paused) return
    const t = setInterval(next, 5500)
    return () => clearInterval(t)
  }, [multiple, paused, next])

  const slide = slides[current]

  return (
    <section
      className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background media */}
      {slide.media && (
        <div className="absolute inset-0">
          <SlideMedia media={slide.media} heading={slide.heading} />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/85 via-zinc-950/55 to-transparent" />
        </div>
      )}
      {!slide.media && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.08),_transparent_60%)]" />
      )}

      {/* Slide content */}
      <div className="container relative z-10 py-20">
        <div className="max-w-2xl">
          {slide.heading && (
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
              {slide.heading}
              {slide.subheading && (
                <span className="text-transparent bg-clip-text brand-gradient">
                  {" "}{slide.subheading}
                </span>
              )}
            </h1>
          )}
          {slide.description && (
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
              {slide.description}
            </p>
          )}
          {slide.ctaText && slide.ctaLink && (
            <Button variant="brand" size="xl" asChild>
              <Link href={slide.ctaLink}>
                {slide.ctaText} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Carousel controls */}
      {multiple && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === current ? "w-6 bg-brand-400" : "w-2 bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
