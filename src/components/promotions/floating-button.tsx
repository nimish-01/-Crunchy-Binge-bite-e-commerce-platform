"use client"

import { useState, useEffect, useCallback } from "react"

interface FloatConfig {
  text?: string
  icon?: string
  link: string
  bgColor: string
  textColor: string
  position: "bottom-right" | "bottom-left" | "bottom-center"
}

interface Promotion {
  id: string
  config: FloatConfig
}

const POSITION_CLASSES: Record<string, string> = {
  "bottom-right":  "fixed bottom-6 right-6",
  "bottom-left":   "fixed bottom-6 left-6",
  "bottom-center": "fixed bottom-6 left-1/2 -translate-x-1/2",
}

export default function FloatingButton() {
  const [buttons, setButtons] = useState<Promotion[]>([])

  const trackEvent = useCallback(async (id: string, event: "impression" | "click") => {
    await fetch(`/api/promotions/${id}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    }).catch(() => null)
  }, [])

  useEffect(() => {
    async function load() {
      const res  = await fetch("/api/promotions?type=FLOATING_BUTTON")
      const json = await res.json()
      const promos: Promotion[] = json.promotions ?? []
      setButtons(promos)
      promos.forEach((p) => trackEvent(p.id, "impression"))
    }
    load()
  }, [trackEvent])

  if (!buttons.length) return null

  return (
    <>
      {buttons.map((p) => {
        const cfg = p.config
        const posClass = POSITION_CLASSES[cfg.position] ?? POSITION_CLASSES["bottom-right"]

        return (
          <a
            key={p.id}
            href={cfg.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent(p.id, "click")}
            className={`${posClass} z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg hover:scale-105 transition-transform`}
            style={{ backgroundColor: cfg.bgColor, color: cfg.textColor }}
          >
            {cfg.icon && <span className="text-lg leading-none">{cfg.icon}</span>}
            {cfg.text && <span className="font-medium text-sm hidden sm:block">{cfg.text}</span>}
          </a>
        )
      })}
    </>
  )
}
