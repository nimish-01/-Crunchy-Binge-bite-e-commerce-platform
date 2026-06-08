"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CreditCard, Truck, MapPin, Plus, Star, Tag, X, CheckCircle2, Sparkles, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { formatPrice } from "@/lib/utils"
import { addressSchema, type AddressInput } from "@/lib/validations/order"

// ─── Razorpay types ─────────────────────────────────────────────────────────
interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string
  description?: string; order_id: string
  handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void
  prefill?: { name?: string; email?: string }
  modal?: { ondismiss?: () => void }
  theme?: { color?: string }
}
declare global {
  interface Window {
    Razorpay: new (o: RazorpayOptions) => {
      open(): void
      on(event: string, handler: (r: { error: { description: string } }) => void): void
    }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) { resolve(true); return }
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

interface SavedAddress {
  id: string; name: string; phone: string; line1: string; line2: string | null
  city: string; state: string; pincode: string; isDefault: boolean
}

interface CouponSuggestion {
  id: string; code: string; type: string; value: number
  maxDiscount: number | null; minOrderValue: number; description: string | null
  applicable: boolean; gap: number; discountPreview: number
}

function describeDiscount(s: CouponSuggestion): string {
  if (s.type === "FREE_SHIPPING") return "Free shipping"
  if (s.type === "FLAT") return `Flat ₹${s.value} off`
  const pct = `${s.value}% off`
  return s.maxDiscount ? `${pct} (up to ₹${s.maxDiscount})` : pct
}

const PAYMENT_METHODS = [
  { id: "razorpay", label: "Pay Online", icon: CreditCard, desc: "UPI · Cards · Netbanking · Wallets (powered by Razorpay)" },
  { id: "cod", label: "Cash on Delivery", icon: Truck, desc: "Pay when your order arrives" },
]

// ─── Component ───────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { items, subtotal, total, discountAmount, deliveryCharge, coupon, applyCoupon, removeCoupon, clearCart } = useCart()

  const [paymentMethod, setPaymentMethod] = useState("razorpay")
  const [placing, setPlacing] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [selectedAddress, setSelectedAddress] = useState<string>("new")
  const [couponInput, setCouponInput] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [suggestions, setSuggestions] = useState<CouponSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)

  const { register, handleSubmit, formState: { errors } } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
  })

  useEffect(() => {
    if (!session?.user?.id) { setLoadingAddresses(false); return }
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const addrs: SavedAddress[] = data.data.addresses
          setSavedAddresses(addrs)
          const def = addrs.find((a) => a.isDefault) ?? addrs[0]
          if (def) setSelectedAddress(`saved:${def.id}`)
          else setSelectedAddress("new")
        }
      })
      .finally(() => setLoadingAddresses(false))
  }, [session?.user?.id])

  // ─── Fetch coupon suggestions whenever subtotal changes ──────────────────
  useEffect(() => {
    if (!session?.user?.id || coupon) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/coupons/available?subtotal=${subtotal}`)
        const data = await res.json()
        if (data.success) setSuggestions(data.data.suggestions)
      } catch { /* silently ignore — suggestions are non-critical */ }
    }, 350)
    return () => clearTimeout(t)
  }, [subtotal, session?.user?.id, coupon])

  // ─── Coupon ──────────────────────────────────────────────────────────────
  async function handleApplyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    setCouponError("")
    setCouponLoading(true)
    const result = await applyCoupon(code)
    if (!result.success) setCouponError(result.error ?? "Invalid coupon")
    else setCouponInput("")
    setCouponLoading(false)
  }

  async function handleApplySuggestion(code: string) {
    setCouponError("")
    setCouponLoading(true)
    const result = await applyCoupon(code)
    if (!result.success) setCouponError(result.error ?? "Invalid coupon")
    setCouponLoading(false)
  }

  // ─── Core order placement ─────────────────────────────────────────────────
  const processOrder = useCallback(async (addressId: string) => {
    const couponCode = coupon?.code

    if (paymentMethod === "cod") {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, paymentMethod: "COD", couponCode }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      clearCart()
      router.push(`/order-success?order=${data.data.order.orderNumber}`)
      return
    }

    // ── Razorpay ────────────────────────────────────────────────────────────
    const loaded = await loadRazorpayScript()
    if (!loaded) throw new Error("Failed to load Razorpay. Check your internet connection.")

    const createRes = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId, couponCode }),
    })
    const createData = await createRes.json()
    if (!createData.success) throw new Error(createData.error)

    const { razorpayOrderId, amount, currency, key } = createData.data

    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key, amount, currency, order_id: razorpayOrderId,
        name: "Binge Bite", description: "Makhana Order",
        prefill: { name: session?.user?.name ?? undefined, email: session?.user?.email ?? undefined },
        theme: { color: "#84cc16" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                addressId, paymentMethod: "RAZORPAY", couponCode,
              }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyData.success) throw new Error(verifyData.error)
            clearCart()
            router.push(`/order-success?order=${verifyData.data.orderNumber}`)
            resolve()
          } catch (err) { reject(err) }
        },
        modal: {
          ondismiss: () => { resolve(); setPlacing(false) },
        },
      })
      rzp.on("payment.failed", (response) => {
        router.push(`/order-failed?reason=${encodeURIComponent(response.error.description)}`)
        resolve()
      })
      rzp.open()
    })
  }, [paymentMethod, coupon, session, clearCart, router])

  // ─── Submit handlers ──────────────────────────────────────────────────────
  async function onSubmitSavedAddress() {
    setPlacing(true)
    try {
      await processOrder(selectedAddress.replace("saved:", ""))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Something went wrong. Please try again.")
      setPlacing(false)
    }
  }

  async function onSubmitNewAddress(data: AddressInput) {
    setPlacing(true)
    try {
      const saveRes = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isDefault: savedAddresses.length === 0 }),
      })
      const saveData = await saveRes.json()
      if (!saveData.success) throw new Error(saveData.error)
      await processOrder(saveData.data.address.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Something went wrong. Please try again.")
      setPlacing(false)
    }
  }

  if (items.length === 0) { router.push("/products"); return null }

  const isUsingSaved = selectedAddress !== "new"

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Left column ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Delivery Address */}
          <Card>
            <CardHeader><CardTitle>Delivery Address</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loadingAddresses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading saved addresses…
                </div>
              ) : (
                <>
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddress(`saved:${addr.id}`)}
                      className={`w-full text-left flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                        selectedAddress === `saved:${addr.id}` ? "border-brand-500 bg-brand-500/10" : "border-border hover:border-brand-500/40"
                      }`}
                    >
                      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 ${
                        selectedAddress === `saved:${addr.id}` ? "border-brand-500 bg-brand-500" : "border-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-medium text-sm">{addr.name}</span>
                          {addr.isDefault && (
                            <Badge variant="success" className="text-xs gap-1"><Star className="h-3 w-3" />Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{addr.phone}</p>
                        <p className="text-sm">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} – {addr.pincode}</p>
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setSelectedAddress("new")}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                      selectedAddress === "new" ? "border-brand-500 bg-brand-500/10" : "border-border hover:border-brand-500/40"
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                      selectedAddress === "new" ? "border-brand-500 bg-brand-500" : "border-muted-foreground"
                    }`} />
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {savedAddresses.length > 0 ? "Use a different address" : "Add delivery address"}
                    </span>
                  </button>

                  {selectedAddress === "new" && (
                    <form id="checkout-form" onSubmit={handleSubmit(onSubmitNewAddress)}>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="col-span-2 space-y-1.5">
                          <Label>Full Name</Label>
                          <Input placeholder={session?.user?.name ?? "Priya Sharma"} {...register("name")} />
                          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Phone</Label>
                          <Input placeholder="9876543210" maxLength={10} {...register("phone")} />
                          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Pincode</Label>
                          <Input placeholder="560001" maxLength={6} {...register("pincode")} />
                          {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label>Address Line 1</Label>
                          <Input placeholder="House/Flat No., Building, Street" {...register("line1")} />
                          {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label>Address Line 2 (Optional)</Label>
                          <Input placeholder="Area, Landmark" {...register("line2")} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>City</Label>
                          <Input placeholder="Bengaluru" {...register("city")} />
                          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>State</Label>
                          <Input placeholder="Karnataka" {...register("state")} />
                          {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
                        </div>
                      </div>
                    </form>
                  )}

                  {savedAddresses.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                      <MapPin className="h-3 w-3" />
                      Manage in <a href="/profile/addresses" className="text-brand-400 hover:underline">My Addresses</a>
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      paymentMethod === method.id ? "border-brand-500 bg-brand-500/10" : "border-border hover:border-brand-500/40"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${paymentMethod === method.id ? "bg-brand-500/20" : "bg-muted"}`}>
                      <Icon className={`h-5 w-5 ${paymentMethod === method.id ? "text-brand-400" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">{method.label}</p>
                      <p className="text-xs text-muted-foreground">{method.desc}</p>
                    </div>
                    <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${paymentMethod === method.id ? "border-brand-500 bg-brand-500" : "border-border"}`} />
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium line-clamp-1">{item.product.name}</p>
                      <p className="text-muted-foreground">{item.variant.weight} × {item.quantity}</p>
                    </div>
                    <p className="font-medium">{formatPrice(item.variant.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Coupon */}
              {coupon ? (
                <div className="flex items-center justify-between rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-400">{coupon.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {coupon.type === "FREE_SHIPPING" ? "Free shipping applied" : `−${formatPrice(discountAmount)} discount`}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-muted-foreground hover:text-foreground ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Have a coupon?
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError("") }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      className="uppercase text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="shrink-0"
                    >
                      {couponLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {couponError && <p className="text-xs text-destructive">{couponError}</p>}

                  {/* ── Available Offers ─────────────────────────────────── */}
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowSuggestions((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        <Sparkles className="h-3 w-3 text-brand-400" />
                        Available Offers ({suggestions.length})
                        <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
                      </button>

                      {showSuggestions && suggestions.map((s) => (
                        <div
                          key={s.id}
                          className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            s.applicable
                              ? "border-brand-500/40 bg-brand-500/5"
                              : "border-border/50 bg-muted/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded">
                                  {s.code}
                                </span>
                                <span className="text-xs text-muted-foreground">{describeDiscount(s)}</span>
                              </div>
                              {s.description && (
                                <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                              )}
                              {s.applicable ? (
                                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  {s.type === "FREE_SHIPPING"
                                    ? "Free shipping on this order"
                                    : `You save ${formatPrice(s.discountPreview)}`}
                                </p>
                              ) : (
                                <p className="text-xs text-amber-400 mt-1">
                                  Add {formatPrice(s.gap)} more to unlock
                                  {s.minOrderValue > 0 && ` · Min. order ${formatPrice(s.minOrderValue)}`}
                                </p>
                              )}
                            </div>
                            {s.applicable && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 h-7 text-xs border-brand-500/40 text-brand-400 hover:bg-brand-500/10"
                                onClick={() => handleApplySuggestion(s.code)}
                                disabled={couponLoading}
                              >
                                Apply
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Pricing */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Coupon ({coupon?.code})</span>
                    <span>−{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>
                    {deliveryCharge > 0 ? formatPrice(deliveryCharge) : <Badge variant="success">FREE</Badge>}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-brand-400">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Pay button */}
              {isUsingSaved ? (
                <Button variant="brand" className="w-full" size="lg" onClick={onSubmitSavedAddress} disabled={placing || loadingAddresses}>
                  {placing
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing…</>
                    : paymentMethod === "cod" ? `Place Order • ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
                </Button>
              ) : (
                <Button variant="brand" className="w-full" size="lg" type="submit" form="checkout-form" disabled={placing}>
                  {placing
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing…</>
                    : paymentMethod === "cod" ? `Place Order • ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
                </Button>
              )}

              {paymentMethod === "razorpay" && (
                <p className="text-xs text-muted-foreground text-center">🔒 Secured by Razorpay · PCI-DSS compliant</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
