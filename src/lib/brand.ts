import type { SiteSettings } from "@prisma/client"

/**
 * Server-side logo selection for surfaces outside the themed site UI
 * (emails, invoices, packing slips). Logos come from Admin → Settings → Logo.
 */
type BrandFields = Pick<SiteSettings, "logoUrl" | "logoLightUrl" | "logoMarkUrl">

export interface BrandLogo {
  url: string
  /** "full" already contains the name; "mark" should be paired with text */
  kind: "full" | "mark"
}

/** White backgrounds (print). The main logo is made for dark backgrounds, so it's skipped. */
export function logoForLightBackground(s: Partial<BrandFields> | null | undefined): BrandLogo | null {
  if (s?.logoLightUrl) return { url: s.logoLightUrl, kind: "full" }
  if (s?.logoMarkUrl) return { url: s.logoMarkUrl, kind: "mark" }
  return null
}

/** Dark backgrounds (the email header). */
export function logoForDarkBackground(s: Partial<BrandFields> | null | undefined): BrandLogo | null {
  if (s?.logoUrl) return { url: s.logoUrl, kind: "full" }
  if (s?.logoMarkUrl) return { url: s.logoMarkUrl, kind: "mark" }
  return null
}

/**
 * Many email clients (Gmail, Outlook) don't render SVG or WebP. For Cloudinary
 * media-library URLs, ask Cloudinary for a PNG at the display height; other
 * hosts are used only if already PNG/JPEG/GIF. Returns null if unusable.
 */
export function emailSafeImageUrl(url: string, height: number): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:") return null

  const marker = "/image/upload/"
  if (parsed.hostname === "res.cloudinary.com" && parsed.pathname.includes(marker)) {
    const [prefix, rest] = parsed.pathname.split(marker)
    const withPng = rest.replace(/\.[a-z0-9]+$/i, "") + ".png"
    parsed.pathname = `${prefix}${marker}c_fit,h_${height}/${withPng}`
    parsed.search = ""
    return parsed.toString()
  }

  return /\.(png|jpe?g|gif)$/i.test(parsed.pathname) ? parsed.toString() : null
}
