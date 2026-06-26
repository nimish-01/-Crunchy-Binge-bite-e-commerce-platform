"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import CountdownTimer from "./countdown-timer"

interface MediaInfo {
  secureUrl: string
  thumbnailUrl?: string | null
  resourceType: string
  publicId?: string
}

interface BannerConfig {
  desktopMedia?: MediaInfo | null
  tabletMedia?:  MediaInfo | null
  mobileMedia?:  MediaInfo | null
  heading?: string
  subheading?: string
  description?: string
  ctaText?: string
  ctaLink?: string
}

interface CountdownConfig extends BannerConfig {
  media?: MediaInfo | null
  countdownEndsAt?: string
  countdownStyle?: string
  textBefore?: string
  textAfter?: string
}

interface Promotion {
  id: string
  type: string
  config: BannerConfig & CountdownConfig
}

export default function HomepageBanner() {
  const [banners,     setBanners]     = useState<Promotion[]>([])
  const [countdowns,  setCountdowns]  = useState<Promotion[]>([])

  const trackEvent = useCallback(async (promoId: string, event: "impression" | "click") => {
    await fetch(`/api/promotions/${promoId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    }).catch(() => null)
  }, [])

  useEffect(() => {
    async function load() {
      const [bannerRes, countdownRes] = await Promise.all([
        fetch("/api/promotions?type=HOMEPAGE_BANNER&page=homepage"),
        fetch("/api/promotions?type=COUNTDOWN_CAMPAIGN&page=homepage"),
      ])
      if (bannerRes.ok) {
        const json = await bannerRes.json()
        const promos = json.promotions ?? []
        setBanners(promos)
        promos.forEach((p: Promotion) => trackEvent(p.id, "impression"))
      }
      if (countdownRes.ok) {
        const json = await countdownRes.json()
        const promos = json.promotions ?? []
        setCountdowns(promos)
        promos.forEach((p: Promotion) => trackEvent(p.id, "impression"))
      }
    }
    load()
  }, [trackEvent])

  if (!banners.length && !countdowns.length) return null

  return (
    <section className="w-full space-y-6">
      {/* Homepage banners */}
      {banners.map((promo) => {
        const cfg = promo.config
        const media = cfg.desktopMedia ?? cfg.tabletMedia ?? cfg.mobileMedia

        return (
          <div key={promo.id} className="relative w-full overflow-hidden rounded-2xl bg-card border border-border/40">
            {media && (
              <div className="relative w-full aspect-[21/6]">
                <Image
                  src={media.thumbnailUrl ?? media.secureUrl}
                  alt={cfg.heading ?? ""}
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              </div>
            )}
            {(cfg.heading || cfg.ctaText) && (
              <div className={`${media ? "absolute inset-0" : ""} flex flex-col justify-center px-8 py-10 gap-3`}>
                {cfg.heading && (
                  <h2 className="text-2xl sm:text-4xl font-bold text-white">{cfg.heading}</h2>
                )}
                {cfg.subheading && (
                  <p className="text-lg text-white/80">{cfg.subheading}</p>
                )}
                {cfg.description && (
                  <p className="text-sm text-white/70 max-w-md">{cfg.description}</p>
                )}
                {cfg.ctaText && cfg.ctaLink && (
                  <Link
                    href={cfg.ctaLink}
                    onClick={() => trackEvent(promo.id, "click")}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-brand-500 text-black font-semibold text-sm w-fit hover:bg-brand-400 transition-colors"
                  >
                    {cfg.ctaText}
                  </Link>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Countdown campaigns */}
      {countdowns.map((promo) => {
        const cfg = promo.config as CountdownConfig
        if (!cfg.countdownEndsAt) return null

        return (
          <div key={promo.id} className="relative w-full rounded-2xl bg-card border border-border/40 overflow-hidden">
            {cfg.media && (
              <div className="relative w-full aspect-[21/5]">
                <Image
                  src={cfg.media.thumbnailUrl ?? cfg.media.secureUrl}
                  alt={cfg.heading ?? ""}
                  fill className="object-cover" unoptimized
                />
                <div className="absolute inset-0 bg-black/50" />
              </div>
            )}
            <div className={`${cfg.media ? "absolute inset-0" : ""} flex flex-col items-center justify-center py-10 px-6 gap-4 text-center`}>
              {cfg.heading && (
                <h2 className={`text-2xl font-bold ${cfg.media ? "text-white" : ""}`}>{cfg.heading}</h2>
              )}
              <CountdownTimer
                endsAt={cfg.countdownEndsAt}
                style={cfg.countdownStyle}
                textBefore={cfg.textBefore}
                textAfter={cfg.textAfter}
              />
              {cfg.ctaText && cfg.ctaLink && (
                <Link
                  href={cfg.ctaLink}
                  onClick={() => trackEvent(promo.id, "click")}
                  className="inline-flex items-center px-6 py-3 rounded-full bg-brand-500 text-black font-semibold text-sm hover:bg-brand-400 transition-colors"
                >
                  {cfg.ctaText}
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
