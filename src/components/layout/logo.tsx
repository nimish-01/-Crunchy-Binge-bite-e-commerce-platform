"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useBrand } from "@/contexts/brand-context"
import { useTheme } from "@/contexts/theme-context"

/**
 * Brand logo. Sources are tried in order until one loads:
 *   1. Logo uploaded in Admin → Settings → Brand Logo
 *      (the light-background version is used on the light/foodie themes)
 *   2. Static files in /public: /logo.svg (full) and /logo-mark.svg (mark)
 *   3. The 🌾 + text treatment
 */
const STATIC_SOURCES = {
  full: "/logo.svg",
  mark: "/logo-mark.svg",
} as const

interface LogoProps {
  variant?: keyof typeof STATIC_SOURCES
  /** Rendered height in px; width follows the image's aspect ratio */
  size?: number
  /** Alt text, and the text shown by the fallback for the full variant */
  name?: string
  priority?: boolean
  className?: string
}

export function Logo({
  variant = "full",
  size = 28,
  name = "Crunchy Bingebite",
  priority,
  className,
}: LogoProps) {
  const brand = useBrand()
  const { theme } = useTheme()

  const uploaded =
    variant === "mark"
      ? brand.logoMarkUrl
      : (theme === "light" || theme === "foodie") && brand.logoLightUrl
        ? brand.logoLightUrl
        : brand.logoUrl
  const sources = [uploaded, STATIC_SOURCES[variant]].filter(Boolean)

  // Changing the uploaded logo restarts the chain from the top
  return <LogoImage key={sources.join("|")} sources={sources} {...{ variant, size, name, priority, className }} />
}

function LogoImage({
  sources, variant, size, name, priority, className,
}: Required<Omit<LogoProps, "priority" | "className">> &
  Pick<LogoProps, "priority" | "className"> & { sources: string[] }) {
  const [index, setIndex] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const src = sources[index]

  // An image that errors before hydration never fires React's onError.
  // decode() rejects only for broken images (naturalWidth can be 0 for a
  // valid viewBox-only SVG, so it isn't a reliable signal).
  useEffect(() => {
    let cancelled = false
    imgRef.current?.decode().catch(() => {
      if (!cancelled) setIndex((i) => (i === index ? i + 1 : i))
    })
    return () => { cancelled = true }
  }, [index])

  if (!src) {
    return (
      <span className={cn("inline-flex items-center gap-2 font-bold leading-none", className)}>
        <span className="text-brand-500 leading-none" style={{ fontSize: size * 0.8 }} aria-hidden>
          🌾
        </span>
        {variant === "full" && <span>{name}</span>}
      </span>
    )
  }

  return (
    <Image
      ref={imgRef}
      src={src}
      alt={name}
      width={variant === "mark" ? size : size * 5}
      height={size}
      unoptimized
      priority={priority}
      onError={() => setIndex((i) => (i === index ? i + 1 : i))}
      className={cn("w-auto shrink-0 select-none object-contain", className)}
      style={{ height: size, maxWidth: variant === "mark" ? size * 1.5 : size * 8 }}
    />
  )
}
