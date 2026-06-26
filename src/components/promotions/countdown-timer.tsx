"use client"

import { useState, useEffect } from "react"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(endsAt: string): TimeLeft {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now())
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

function Digit({ value, label, style }: { value: number; label: string; style: string }) {
  const pad = String(value).padStart(2, "0")

  if (style === "BLOCKS") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="bg-foreground text-background rounded-lg px-3 py-2 font-mono text-2xl font-bold min-w-[60px] text-center">
          {pad}
        </div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
    )
  }
  if (style === "MINIMAL") {
    return (
      <div className="flex flex-col items-center">
        <span className="font-mono text-3xl font-bold">{pad}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
    )
  }
  // DIGITAL (default)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-brand-500 text-black rounded px-3 py-2 font-mono text-2xl font-bold min-w-[56px] text-center">
        {pad}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

interface Props {
  endsAt: string
  style?: string
  textBefore?: string
  textAfter?: string
}

export default function CountdownTimer({ endsAt, style = "DIGITAL", textBefore, textAfter }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(endsAt))
  const [expired, setExpired]   = useState(false)

  useEffect(() => {
    const tick = () => {
      const left = getTimeLeft(endsAt)
      setTimeLeft(left)
      if (Object.values(left).every((v) => v === 0)) setExpired(true)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (expired) return null

  return (
    <div className="flex flex-col items-center gap-3">
      {textBefore && <p className="text-sm text-muted-foreground">{textBefore}</p>}
      <div className="flex items-center gap-3">
        <Digit value={timeLeft.days}    label="Days"    style={style} />
        <span className="text-2xl font-bold text-muted-foreground mb-4">:</span>
        <Digit value={timeLeft.hours}   label="Hours"   style={style} />
        <span className="text-2xl font-bold text-muted-foreground mb-4">:</span>
        <Digit value={timeLeft.minutes} label="Min"     style={style} />
        <span className="text-2xl font-bold text-muted-foreground mb-4">:</span>
        <Digit value={timeLeft.seconds} label="Sec"     style={style} />
      </div>
      {textAfter && <p className="text-sm font-medium">{textAfter}</p>}
    </div>
  )
}
