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
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
    )
  }
  return (
    <Image
      src={media.secureUrl}
      alt={media.altText || heading}
      fill
      className="object-cover opacity-65"
      priority
      sizes="100vw"
    />
  )
}

export default function HeroCarousel({ slides }: Props) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused]   = useState(false)
  const multiple = slides.length > 1

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length]
  )
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length)

  useEffect(() => {
    if (!multiple || paused) return
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [multiple, paused, next])

  const slide = slides[current]

  return (
    <section
      className="relative min-h-[88vh] flex items-center overflow-hidden bg-zinc-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Hero banner"
    >
      {/* Background */}
      {slide.media ? (
        <div className="absolute inset-0">
          <SlideMedia media={slide.media} heading={slide.heading} />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(245,158,11,0.07),transparent)]" />
      )}

      {/* Content */}
      <div
        className="container relative z-10 py-24"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="max-w-xl">
          {slide.heading && (
            <h1
              key={`h-${current}`}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-5 animate-slide-up"
            >
              {slide.heading}
              {slide.subheading && (
                <span className="brand-gradient-text">
                  {" "}{slide.subheading}
                </span>
              )}
            </h1>
          )}
          {slide.description && (
            <p
              key={`d-${current}`}
              className="text-base sm:text-lg text-zinc-300 mb-8 leading-relaxed max-w-md animate-slide-up stagger-2"
            >
              {slide.description}
            </p>
          )}
          {slide.ctaText && slide.ctaLink && (
            <div key={`btn-${current}`} className="animate-slide-up stagger-3">
              <Button variant="brand" size="lg" asChild className="gap-2 font-semibold shadow-brand-md">
                <Link href={slide.ctaLink}>
                  {slide.ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {multiple && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Slide indicator */}
          <div
            className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
            role="tablist"
            aria-label="Slide navigation"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-400",
                  i === current
                    ? "w-8 bg-brand-400"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>

          {/* Progress bar */}
          {!paused && (
            <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/10">
              <div
                key={`progress-${current}`}
                className="h-full bg-brand-400/70"
                style={{ animation: "progress 6s linear forwards" }}
              />
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </section>
  )
}
