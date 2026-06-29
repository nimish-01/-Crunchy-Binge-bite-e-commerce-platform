"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ShoppingBag, Heart, CheckCircle2, Package, MapPin, CreditCard, FileText, Share2, Headphones, Star, Gift } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface OrderItem {
  id: string
  name: string
  image?: string
  weight: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface OrderAddress {
  name: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  state: string
  pincode: string
}

interface Props {
  orderNumber:    string
  orderId:        string
  headline:       string
  message:        string
  animation:      string
  showReorder:    boolean
  total:          number
  subtotal:       number
  discountAmount: number
  deliveryCharge: number
  paymentMethod?: string | null
  items:          OrderItem[]
  address?:       OrderAddress | null
  estimatedDays?: number
  loyaltyPoints?: number | null
  pointsEarned?:  number | null
}

// ─── Success Chime (Web Audio API) ───────────────────────────────────────────

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    // Three ascending notes: C5 → E5 → G5
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type      = "sine"
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
      osc.start(start)
      osc.stop(start + 0.55)
    })
  } catch { /* autoplay blocked — silent fallback */ }
}

// ─── Canvas Confetti ──────────────────────────────────────────────────────────

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = [
      "#f97316", "#3b82f6", "#10b981", "#f59e0b",
      "#ec4899", "#8b5cf6", "#06b6d4", "#22c55e", "#ef4444",
    ]

    type Particle = {
      x: number; y: number; vx: number; vy: number
      r: number; color: string; rotation: number; rotSpeed: number
      shape: "rect" | "circle"; w: number; h: number; alpha: number
    }

    const particles: Particle[] = []
    for (let i = 0; i < 220; i++) {
      particles.push({
        x:        Math.random() * canvas.width,
        y:        -20 - Math.random() * 300,
        vx:       (Math.random() - 0.5) * 5,
        vy:       2 + Math.random() * 5,
        r:        4 + Math.random() * 7,
        color:    COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        shape:    Math.random() > 0.5 ? "rect" : "circle",
        w:        6 + Math.random() * 12,
        h:        4 + Math.random() * 9,
        alpha:    1,
      })
    }

    let rafId: number
    let startTime: number

    function draw(ts: number) {
      if (!ctx || !canvas) return
      if (!startTime) startTime = ts
      const elapsed = ts - startTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let anyAlive = false
      for (const p of particles) {
        p.x        += p.vx
        p.y        += p.vy
        p.vy       += 0.07
        p.vx       *= 0.99
        p.rotation += p.rotSpeed

        if (elapsed > 4500) p.alpha = Math.max(0, p.alpha - 0.012)
        if (p.alpha > 0) anyAlive = true

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        if (p.shape === "circle") {
          ctx.beginPath()
          ctx.arc(0, 0, p.r, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }

      if (anyAlive) {
        rafId = requestAnimationFrame(draw)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [active])

  return canvasRef
}

// ─── Fireworks (CSS) ─────────────────────────────────────────────────────────

function Fireworks() {
  const bursts = [
    { x: "15%", y: "25%", delay: "0s",   color: "#f97316" },
    { x: "80%", y: "18%", delay: "0.5s", color: "#3b82f6" },
    { x: "50%", y: "12%", delay: "1s",   color: "#10b981" },
    { x: "10%", y: "60%", delay: "1.5s", color: "#ec4899" },
    { x: "88%", y: "55%", delay: "0.3s", color: "#f59e0b" },
    { x: "40%", y: "22%", delay: "0.8s", color: "#8b5cf6" },
    { x: "65%", y: "40%", delay: "1.3s", color: "#06b6d4" },
  ]
  const sparks = Array.from({ length: 12 }, (_, i) => i * 30)

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-10">
      {bursts.map((b, bi) => (
        <div key={bi} className="absolute" style={{ left: b.x, top: b.y }}>
          {sparks.map((deg) => (
            <div
              key={deg}
              className="absolute h-1 rounded-full firework-spark"
              style={{
                width: "40px",
                background: b.color,
                transform: `rotate(${deg}deg)`,
                transformOrigin: "0 50%",
                animationDelay: b.delay,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Stars (CSS) ─────────────────────────────────────────────────────────────

function StarsFall() {
  const COLORS = ["#f59e0b", "#f97316", "#ec4899", "#8b5cf6", "#06b6d4"]
  const count = 45
  const stars = Array.from({ length: count }, (_, i) => ({
    x:     (i * 2.3) % 100,
    size:  12 + (i * 7) % 22,
    delay: `${(i * 0.13) % 3}s`,
    dur:   `${2 + (i * 0.09) % 2}s`,
    color: COLORS[i % 5],
  }))

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-10">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute star-fall"
          style={{
            left:              `${s.x}%`,
            top:               "-5%",
            color:             s.color,
            fontSize:          `${s.size}px`,
            animationDuration: s.dur,
            animationDelay:    s.delay,
          }}
        >
          ★
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrderCelebration({
  orderNumber, orderId, headline, message,
  animation, showReorder,
  total, subtotal, discountAmount, deliveryCharge,
  paymentMethod, items, address, estimatedDays = 5,
  loyaltyPoints, pointsEarned,
}: Props) {
  const [showBanner, setShowBanner] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const confettiRef = useConfetti(animation === "CONFETTI")

  async function handleShare() {
    const shareData = {
      title: "My Binge Bite Order",
      text: `I just ordered from Binge Bite! Order #${orderNumber}`,
      url: typeof window !== "undefined" ? `${window.location.origin}/orders/${orderId}` : "",
    }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2500)
      }
    } catch { /* user cancelled */ }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setShowBanner(true)
      playSuccessChime()
    }, 80)
    return () => clearTimeout(t)
  }, [])

  const estimatedDate = new Date()
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDays)
  const estDateStr = estimatedDate.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "long",
  })

  return (
    <>
      {/* Confetti canvas */}
      {animation === "CONFETTI" && (
        <canvas
          ref={confettiRef}
          className="pointer-events-none fixed inset-0 z-10"
          style={{ width: "100%", height: "100%" }}
        />
      )}

      {animation === "FIREWORKS" && <Fireworks />}
      {animation === "STARS"     && <StarsFall />}

      {/* ── Hero Banner ── */}
      <div
        className={`
          relative rounded-2xl overflow-hidden transition-all duration-700
          ${showBanner ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/25 via-emerald-500/10 to-brand-500/25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-400/15 via-transparent to-transparent" />

        <div className="relative px-6 py-10 text-center">
          {/* Floating emoji */}
          <div className="absolute top-4 left-6  text-3xl animate-bounce [animation-delay:0.2s]">🎉</div>
          <div className="absolute top-5 right-8 text-2xl animate-bounce [animation-delay:0.6s]">✨</div>
          <div className="absolute bottom-4 left-10 text-xl animate-bounce [animation-delay:0.9s]">🌟</div>
          <div className="absolute bottom-5 right-6 text-3xl animate-bounce [animation-delay:1.2s]">🎊</div>

          {/* Check icon */}
          <div className="relative inline-flex mb-5">
            <div className="h-24 w-24 rounded-full bg-green-500/20 delivered-pulse flex items-center justify-center">
              <div className="h-18 w-18 rounded-full bg-green-500/30 flex items-center justify-center p-3">
                <CheckCircle2 className="h-12 w-12 text-green-400 drop-shadow-lg" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping" />
            <div className="absolute -inset-3 rounded-full border border-green-400/20 animate-spin [animation-duration:8s]" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black mb-3 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent leading-tight">
            {headline}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-4">{message}</p>

          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-5 py-2">
            <span className="text-xs text-muted-foreground">Order</span>
            <span className="font-mono font-bold text-green-400 text-lg">{orderNumber}</span>
          </div>

          {/* Estimated delivery */}
          <div className="mt-4 inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-2">
            <Package className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-medium">Expected by <span className="text-brand-400">{estDateStr}</span></span>
          </div>
        </div>
      </div>

      {/* ── Order Items ── */}
      <div
        className={`
          rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-700 delay-150
          ${showBanner ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        `}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Items Ordered ({items.length})</span>
        </div>
        <div className="divide-y divide-border/40">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-4 py-3">
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.weight} · Qty {item.quantity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">{formatPrice(item.totalPrice)}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(item.unitPrice)} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Address + Payment ── */}
      <div
        className={`
          grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700 delay-300
          ${showBanner ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        `}
      >
        {address && (
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Delivering To</span>
            </div>
            <div className="text-sm space-y-0.5">
              <p className="font-medium">{address.name}</p>
              <p className="text-muted-foreground">{address.phone}</p>
              <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
              <p>{address.city}, {address.state} – {address.pincode}</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Payment</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount</span>
                <span>−{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>{deliveryCharge > 0 ? formatPrice(deliveryCharge) : "FREE"}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-border/50">
              <span>Total</span>
              <span className="text-brand-400">{formatPrice(total)}</span>
            </div>
            {paymentMethod && (
              <p className="text-xs text-muted-foreground pt-1 capitalize">
                via {paymentMethod.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Loyalty Points ── */}
      {(loyaltyPoints != null || pointsEarned != null) && (
        <div
          className={`
            rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-all duration-700 delay-400
            ${showBanner ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1">
              {pointsEarned != null && pointsEarned > 0 ? (
                <>
                  <p className="text-sm font-semibold">
                    +{pointsEarned} loyalty points earned
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {loyaltyPoints != null
                      ? `Your new total: ${loyaltyPoints} points`
                      : "Credited to your account"}
                  </p>
                </>
              ) : loyaltyPoints != null ? (
                <>
                  <p className="text-sm font-semibold">{loyaltyPoints} loyalty points</p>
                  <p className="text-xs text-muted-foreground">Redeem on your next order</p>
                </>
              ) : null}
            </div>
            <Link
              href="/profile/loyalty"
              className="text-xs text-amber-400 hover:underline shrink-0"
            >
              View
            </Link>
          </div>
        </div>
      )}

      {/* ── CTAs ── */}
      <div
        className={`
          space-y-3 transition-all duration-700 delay-500
          ${showBanner ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        `}
      >
        {/* Primary actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/orders/${orderId}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors text-sm"
          >
            <Package className="h-4 w-4" />
            Track Order
          </Link>
          <Link
            href={`/orders/${orderId}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-accent transition-colors font-medium text-sm"
          >
            <FileText className="h-4 w-4" />
            Invoice
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-accent transition-colors font-medium text-sm"
          >
            <Share2 className="h-4 w-4" />
            {shareSuccess ? "Link copied!" : "Share"}
          </button>
        </div>

        {/* Secondary actions */}
        {showReorder && (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-accent transition-colors font-medium text-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
            <Link
              href="/profile/wishlist"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-accent transition-colors font-medium text-sm"
            >
              <Heart className="h-4 w-4" />
              Wishlist
            </Link>
          </div>
        )}

        {/* Help + Referral */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
          <Link
            href="/contact"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Headphones className="h-3.5 w-3.5" />
            Need help?
          </Link>
          <Link
            href="/profile/referrals"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Gift className="h-3.5 w-3.5" />
            Refer a friend · Earn rewards
          </Link>
        </div>
      </div>
    </>
  )
}
