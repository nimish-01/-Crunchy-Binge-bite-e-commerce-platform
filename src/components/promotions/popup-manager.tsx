"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaInfo {
  secureUrl: string
  thumbnailUrl?: string | null
  resourceType: string
}

interface PopupConfig {
  popupType: string
  media?: MediaInfo | null
  title?: string
  subtitle?: string
  description?: string
  ctaText?: string
  ctaLink?: string
  behavior: string
  delaySeconds?: number
  scrollPercent?: number
}

interface Promotion {
  id: string
  config: PopupConfig
  audienceTarget: string
}

function shouldShow(popup: Promotion): boolean {
  const key = `popup-${popup.id}`
  const cfg  = popup.config

  if (cfg.behavior === "ONCE_PER_SESSION") {
    if (sessionStorage.getItem(key)) return false
  } else if (cfg.behavior === "ONCE_PER_DAY") {
    const stored = localStorage.getItem(key)
    if (stored) {
      const diff = Date.now() - parseInt(stored, 10)
      if (diff < 86400000) return false
    }
  }
  // EVERY_VISIT always shows
  return true
}

function markShown(popup: Promotion) {
  const key = `popup-${popup.id}`
  const cfg  = popup.config
  if (cfg.behavior === "ONCE_PER_SESSION") sessionStorage.setItem(key, "1")
  else if (cfg.behavior === "ONCE_PER_DAY") localStorage.setItem(key, String(Date.now()))
}

export default function PopupManager({ displayPage = "homepage" }: { displayPage?: string }) {
  const [popup,   setPopup]   = useState<Promotion | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trackEvent = useCallback(async (id: string, event: "impression" | "click") => {
    await fetch(`/api/promotions/${id}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    }).catch(() => null)
  }, [])

  const showPopup = useCallback((p: Promotion) => {
    if (!shouldShow(p)) return
    setPopup(p)
    setVisible(true)
    markShown(p)
    trackEvent(p.id, "impression")
  }, [trackEvent])

  useEffect(() => {
    async function load() {
      const res  = await fetch(`/api/promotions?type=POPUP&page=${displayPage}`)
      const json = await res.json()
      const promos: Promotion[] = json.promotions ?? []
      if (!promos.length) return

      const p = promos[0]
      const cfg = p.config

      if (cfg.behavior === "EXIT_INTENT") {
        const handleMouseleave = (e: MouseEvent) => {
          if (e.clientY <= 0) { showPopup(p); document.removeEventListener("mouseleave", handleMouseleave) }
        }
        document.addEventListener("mouseleave", handleMouseleave)
        return () => document.removeEventListener("mouseleave", handleMouseleave)
      }

      if (cfg.behavior === "SCROLL_PERCENT") {
        const pct = cfg.scrollPercent ?? 50
        const handleScroll = () => {
          const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          if (scrolled >= pct) { showPopup(p); window.removeEventListener("scroll", handleScroll) }
        }
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
      }

      // Timed / session / day / every visit
      const delay = (cfg.behavior === "AFTER_X_SECONDS" ? (cfg.delaySeconds ?? 0) : 1) * 1000
      timerRef.current = setTimeout(() => showPopup(p), delay)
    }

    load()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [displayPage, showPopup])

  function close() { setVisible(false) }

  if (!popup || !visible) return null

  const cfg = popup.config

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative z-10 bg-card border border-border/50 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={close}
          className="absolute top-3 right-3 h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Media */}
        {cfg.media && (
          <div className="relative w-full aspect-video rounded-t-2xl overflow-hidden bg-muted">
            {cfg.media.resourceType === "video" ? (
              <div className="relative w-full h-full">
                <video
                  src={cfg.media.secureUrl}
                  autoPlay muted loop playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <Image
                src={cfg.media.thumbnailUrl ?? cfg.media.secureUrl}
                alt={cfg.title ?? ""}
                fill className="object-cover" unoptimized
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-3">
          {cfg.title && <h2 className="text-xl font-bold">{cfg.title}</h2>}
          {cfg.subtitle && <p className="text-brand-400 font-medium">{cfg.subtitle}</p>}
          {cfg.description && <p className="text-sm text-muted-foreground">{cfg.description}</p>}
          {cfg.ctaText && cfg.ctaLink && (
            <Link
              href={cfg.ctaLink}
              onClick={() => { trackEvent(popup.id, "click"); close() }}
              className="block w-full"
            >
              <Button variant="brand" className="w-full">
                {cfg.ctaText}
              </Button>
            </Link>
          )}
          <button onClick={close} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
            No thanks, I'll skip
          </button>
        </div>
      </div>
    </div>
  )
}
