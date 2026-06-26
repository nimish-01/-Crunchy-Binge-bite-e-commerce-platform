"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { X } from "lucide-react"

interface AnnouncementBarConfig {
  text: string
  icon?: string
  bgColor: string
  textColor: string
  position: "top" | "bottom"
  dismissible: boolean
  ctaText?: string
  ctaLink?: string
}

interface Promotion {
  id: string
  config: AnnouncementBarConfig
}

export default function AnnouncementBar() {
  const [promotion, setPromotion]   = useState<Promotion | null>(null)
  const [dismissed, setDismissed]   = useState(false)
  const [mounted, setMounted]       = useState(false)

  const trackEvent = useCallback(async (promoId: string, event: "impression" | "click") => {
    await fetch(`/api/promotions/${promoId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    }).catch(() => null)
  }, [])

  useEffect(() => {
    setMounted(true)
    async function load() {
      const res  = await fetch("/api/promotions?type=ANNOUNCEMENT_BAR&page=homepage")
      const json = await res.json()
      const promos: Promotion[] = json.promotions ?? []
      if (!promos.length) return

      const p = promos[0]
      // Check if dismissed this session
      const key = `promo-dismissed-${p.id}`
      if (sessionStorage.getItem(key)) return

      setPromotion(p)
      trackEvent(p.id, "impression")
    }
    load()
  }, [trackEvent])

  if (!mounted || !promotion || dismissed) return null

  const { config } = promotion
  const isBottom = config.position === "bottom"

  function dismiss() {
    if (!promotion) return
    sessionStorage.setItem(`promo-dismissed-${promotion.id}`, "1")
    setDismissed(true)
  }

  return (
    <div
      className={`w-full z-50 ${isBottom ? "fixed bottom-0 left-0 right-0" : ""}`}
      style={{ backgroundColor: config.bgColor, color: config.textColor }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 flex-1 justify-center">
          {config.icon && <span>{config.icon}</span>}
          <span>{config.text}</span>
          {config.ctaText && config.ctaLink && (
            <Link
              href={config.ctaLink}
              onClick={() => trackEvent(promotion.id, "click")}
              className="ml-2 underline font-semibold hover:opacity-80 transition-opacity"
              style={{ color: config.textColor }}
            >
              {config.ctaText}
            </Link>
          )}
        </div>
        {config.dismissible && (
          <button
            onClick={dismiss}
            className="hover:opacity-70 transition-opacity shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" style={{ color: config.textColor }} />
          </button>
        )}
      </div>
    </div>
  )
}
