"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Megaphone, Image as ImageIcon, ShoppingBag, Tag, Layers,
  MousePointerClick, Timer, Loader2, Trash2, Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import MediaPicker from "@/components/admin/media-picker"
import {
  PROMOTION_TYPES, POPUP_TYPES, POPUP_BEHAVIORS, AUDIENCE_TARGETS, DISPLAY_PAGES,
} from "@/lib/validations/promotions"
import type { MediaAsset } from "@prisma/client"

// ─── flat form schema (gets serialized to nested config on submit) ───────────

const schema = z.object({
  name:    z.string().min(1, "Name is required"),
  type:    z.enum(PROMOTION_TYPES),
  isActive:  z.boolean().default(false),
  priority:  z.number().int().min(0).max(100).default(0),
  startsAt:  z.string().optional().default(""),
  endsAt:    z.string().optional().default(""),
  audienceTarget: z.enum(AUDIENCE_TARGETS).default("ALL_VISITORS"),
  displayPages: z.array(z.string()).default([]),
  categoryIds:  z.array(z.string()).default([]),
  productIds:   z.array(z.string()).default([]),

  // Announcement Bar
  barText:       z.string().optional().default(""),
  barIcon:       z.string().optional().default(""),
  barBgColor:    z.string().optional().default("#f59e0b"),
  barTextColor:  z.string().optional().default("#000000"),
  barPosition:   z.enum(["top", "bottom"]).optional().default("top"),
  barDismissible: z.boolean().optional().default(true),
  barCtaText:    z.string().optional().default(""),
  barCtaLink:    z.string().optional().default(""),

  // Common content
  mediaId:      z.string().nullable().optional(),
  heading:      z.string().optional().default(""),
  subheading:   z.string().optional().default(""),
  description:  z.string().optional().default(""),
  ctaText:      z.string().optional().default(""),
  ctaLink:      z.string().optional().default(""),

  // Homepage banner device media
  desktopMediaId: z.string().nullable().optional(),
  tabletMediaId:  z.string().nullable().optional(),
  mobileMediaId:  z.string().nullable().optional(),

  // Popup
  popupType:        z.enum(POPUP_TYPES).optional().default("WELCOME"),
  popupBehavior:    z.enum(POPUP_BEHAVIORS).optional().default("ONCE_PER_SESSION"),
  popupDelaySeconds:   z.number().int().min(0).optional().default(0),
  popupScrollPercent:  z.number().int().min(0).max(100).optional().default(50),

  // Floating
  floatText:      z.string().optional().default(""),
  floatIcon:      z.string().optional().default("💬"),
  floatLink:      z.string().optional().default(""),
  floatBgColor:   z.string().optional().default("#25D366"),
  floatTextColor: z.string().optional().default("#ffffff"),
  floatPosition:  z.string().optional().default("bottom-right"),

  // Countdown
  countdownEndsAt:    z.string().optional().default(""),
  countdownStyle:     z.string().optional().default("DIGITAL"),
  countdownTextBefore: z.string().optional().default("Sale ends in"),
  countdownTextAfter:  z.string().optional().default(""),
})

type FormData = z.infer<typeof schema>

interface Category { id: string; name: string }
interface Product  { id: string; name: string }

function buildConfig(data: FormData): Record<string, unknown> {
  const type = data.type
  if (type === "ANNOUNCEMENT_BAR") {
    return {
      text: data.barText, icon: data.barIcon, bgColor: data.barBgColor,
      textColor: data.barTextColor, position: data.barPosition,
      dismissible: data.barDismissible, ctaText: data.barCtaText, ctaLink: data.barCtaLink,
    }
  }
  if (type === "HOMEPAGE_BANNER") {
    return {
      desktopMediaId: data.desktopMediaId, tabletMediaId: data.tabletMediaId,
      mobileMediaId: data.mobileMediaId, heading: data.heading, subheading: data.subheading,
      description: data.description, ctaText: data.ctaText, ctaLink: data.ctaLink,
    }
  }
  if (type === "POPUP") {
    return {
      popupType: data.popupType, mediaId: data.mediaId, title: data.heading,
      subtitle: data.subheading, description: data.description,
      ctaText: data.ctaText, ctaLink: data.ctaLink, behavior: data.popupBehavior,
      delaySeconds: data.popupDelaySeconds, scrollPercent: data.popupScrollPercent,
    }
  }
  if (type === "FLOATING_BUTTON") {
    return {
      text: data.floatText, icon: data.floatIcon, link: data.floatLink,
      bgColor: data.floatBgColor, textColor: data.floatTextColor, position: data.floatPosition,
    }
  }
  if (type === "COUNTDOWN_CAMPAIGN") {
    return {
      mediaId: data.mediaId, heading: data.heading, description: data.description,
      ctaText: data.ctaText, ctaLink: data.ctaLink, countdownEndsAt: data.countdownEndsAt,
      countdownStyle: data.countdownStyle, textBefore: data.countdownTextBefore,
      textAfter: data.countdownTextAfter,
    }
  }
  // CATEGORY_BANNER, PRODUCT_BANNER
  return {
    mediaId: data.mediaId, heading: data.heading, description: data.description,
    ctaText: data.ctaText, ctaLink: data.ctaLink,
  }
}

function configToForm(type: string, config: Record<string, unknown>): Partial<FormData> {
  const c = config
  if (type === "ANNOUNCEMENT_BAR") {
    return {
      barText: c.text as string ?? "", barIcon: c.icon as string ?? "",
      barBgColor: c.bgColor as string ?? "#f59e0b", barTextColor: c.textColor as string ?? "#000000",
      barPosition: (c.position as "top" | "bottom") ?? "top",
      barDismissible: c.dismissible as boolean ?? true,
      barCtaText: c.ctaText as string ?? "", barCtaLink: c.ctaLink as string ?? "",
    }
  }
  if (type === "HOMEPAGE_BANNER") {
    return {
      desktopMediaId: c.desktopMediaId as string ?? null,
      tabletMediaId: c.tabletMediaId as string ?? null,
      mobileMediaId: c.mobileMediaId as string ?? null,
      heading: c.heading as string ?? "", subheading: c.subheading as string ?? "",
      description: c.description as string ?? "", ctaText: c.ctaText as string ?? "",
      ctaLink: c.ctaLink as string ?? "",
    }
  }
  if (type === "POPUP") {
    return {
      popupType: (c.popupType as typeof POPUP_TYPES[number]) ?? "WELCOME",
      mediaId: c.mediaId as string ?? null, heading: c.title as string ?? "",
      subheading: c.subtitle as string ?? "", description: c.description as string ?? "",
      ctaText: c.ctaText as string ?? "", ctaLink: c.ctaLink as string ?? "",
      popupBehavior: (c.behavior as typeof POPUP_BEHAVIORS[number]) ?? "ONCE_PER_SESSION",
      popupDelaySeconds: c.delaySeconds as number ?? 0,
      popupScrollPercent: c.scrollPercent as number ?? 50,
    }
  }
  if (type === "FLOATING_BUTTON") {
    return {
      floatText: c.text as string ?? "", floatIcon: c.icon as string ?? "💬",
      floatLink: c.link as string ?? "", floatBgColor: c.bgColor as string ?? "#25D366",
      floatTextColor: c.textColor as string ?? "#ffffff",
      floatPosition: c.position as string ?? "bottom-right",
    }
  }
  if (type === "COUNTDOWN_CAMPAIGN") {
    return {
      mediaId: c.mediaId as string ?? null, heading: c.heading as string ?? "",
      description: c.description as string ?? "", ctaText: c.ctaText as string ?? "",
      ctaLink: c.ctaLink as string ?? "", countdownEndsAt: c.countdownEndsAt as string ?? "",
      countdownStyle: c.countdownStyle as string ?? "DIGITAL",
      countdownTextBefore: c.textBefore as string ?? "Sale ends in",
      countdownTextAfter: c.textAfter as string ?? "",
    }
  }
  return {
    mediaId: c.mediaId as string ?? null, heading: c.heading as string ?? "",
    description: c.description as string ?? "", ctaText: c.ctaText as string ?? "",
    ctaLink: c.ctaLink as string ?? "",
  }
}

const TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT_BAR: "Announcement Bar",
  HOMEPAGE_BANNER:  "Homepage Banner",
  CATEGORY_BANNER:  "Category Banner",
  PRODUCT_BANNER:   "Product Banner",
  POPUP:            "Popup Campaign",
  FLOATING_BUTTON:  "Floating Button",
  COUNTDOWN_CAMPAIGN: "Countdown Campaign",
}

const TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ANNOUNCEMENT_BAR: Megaphone,
  HOMEPAGE_BANNER:  ImageIcon,
  CATEGORY_BANNER:  Tag,
  PRODUCT_BANNER:   ShoppingBag,
  POPUP:            Layers,
  FLOATING_BUTTON:  MousePointerClick,
  COUNTDOWN_CAMPAIGN: Timer,
}

function toLocalDatetime(d: string | Date | null | undefined): string {
  if (!d) return ""
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

interface Props {
  promotion?: {
    id: string
    name: string
    type: string
    isActive: boolean
    priority: number
    startsAt: Date | null
    endsAt: Date | null
    audienceTarget: string
    displayPages: string[]
    config: Record<string, unknown>
    categories: { category: Category }[]
    products:   { product:  Product  }[]
  }
}

export default function PromotionForm({ promotion }: Props) {
  const router  = useRouter()
  const { toast } = useToast()
  const isEdit  = !!promotion

  const [categories, setCategories] = useState<Category[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [mediaMap,   setMediaMap]   = useState<Record<string, MediaAsset>>({})

  const configDefaults = promotion
    ? configToForm(promotion.type, promotion.config)
    : {}

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: promotion?.name ?? "",
        type: (promotion?.type as typeof PROMOTION_TYPES[number]) ?? "ANNOUNCEMENT_BAR",
        isActive: promotion?.isActive ?? false,
        priority: promotion?.priority ?? 0,
        startsAt: toLocalDatetime(promotion?.startsAt),
        endsAt:   toLocalDatetime(promotion?.endsAt),
        audienceTarget: (promotion?.audienceTarget as typeof AUDIENCE_TARGETS[number]) ?? "ALL_VISITORS",
        displayPages: promotion?.displayPages ?? [],
        categoryIds:  promotion?.categories.map((c) => c.category.id) ?? [],
        productIds:   promotion?.products.map((p) => p.product.id)    ?? [],
        barBgColor: "#f59e0b", barTextColor: "#000000", barPosition: "top", barDismissible: true,
        floatBgColor: "#25D366", floatTextColor: "#ffffff", floatPosition: "bottom-right",
        floatIcon: "💬", popupType: "WELCOME", popupBehavior: "ONCE_PER_SESSION",
        countdownStyle: "DIGITAL", countdownTextBefore: "Sale ends in",
        ...configDefaults,
      },
    })

  const type     = watch("type")
  const isActive = watch("isActive")
  const displayPages = watch("displayPages")
  const categoryIds  = watch("categoryIds")
  const productIds   = watch("productIds")

  useEffect(() => {
    async function load() {
      const [catRes, proRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products?limit=200"),
      ])
      if (catRes.ok) setCategories((await catRes.json()).categories ?? [])
      if (proRes.ok) setProducts((await proRes.json()).products    ?? [])
    }
    load()
  }, [])

  function handleMedia(field: "mediaId" | "desktopMediaId" | "tabletMediaId" | "mobileMediaId", asset: MediaAsset) {
    setValue(field, asset.id, { shouldDirty: true })
    setMediaMap((prev) => ({ ...prev, [asset.id]: asset }))
  }

  function clearMedia(field: "mediaId" | "desktopMediaId" | "tabletMediaId" | "mobileMediaId") {
    setValue(field, null, { shouldDirty: true })
  }

  function togglePage(page: string) {
    const current = displayPages ?? []
    setValue(
      "displayPages",
      current.includes(page) ? current.filter((p) => p !== page) : [...current, page],
      { shouldDirty: true }
    )
  }

  function toggleCategory(id: string) {
    const current = categoryIds ?? []
    setValue(
      "categoryIds",
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
      { shouldDirty: true }
    )
  }

  function toggleProduct(id: string) {
    const current = productIds ?? []
    setValue(
      "productIds",
      current.includes(id) ? current.filter((p) => p !== id) : [...current, id],
      { shouldDirty: true }
    )
  }

  async function onSubmit(data: FormData) {
    const config = buildConfig(data)
    const payload = {
      name:   data.name,
      type:   data.type,
      isActive: data.isActive,
      priority: data.priority,
      startsAt: data.startsAt || null,
      endsAt:   data.endsAt   || null,
      audienceTarget: data.audienceTarget,
      displayPages: data.displayPages,
      categoryIds:  data.categoryIds,
      productIds:   data.productIds,
      config,
    }

    const url    = isEdit ? `/api/admin/promotions/${promotion!.id}` : "/api/admin/promotions"
    const method = isEdit ? "PATCH" : "POST"

    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const json = await res.json()

    if (!json.success) {
      toast({ title: "Save failed", description: JSON.stringify(json.error), variant: "destructive" })
      return
    }
    toast({ title: isEdit ? "Promotion updated" : "Promotion created" })
    router.push("/admin/promotions")
    router.refresh()
  }

  // Helper: render a media picker row
  function MediaField({ field, label }: { field: "mediaId" | "desktopMediaId" | "tabletMediaId" | "mobileMediaId"; label: string }) {
    const mediaId  = watch(field) as string | null | undefined
    const asset    = mediaId ? mediaMap[mediaId] : null

    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{label}</Label>
        {asset ? (
          <div className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-muted/20 text-sm">
            <span className="truncate flex-1 text-muted-foreground">{asset.publicId.split("/").pop()}</span>
            <MediaPicker
              onSelect={(a) => handleMedia(field, a)}
              trigger={<Button type="button" variant="outline" size="sm">Change</Button>}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => clearMedia(field)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <MediaPicker
            onSelect={(a) => handleMedia(field, a)}
            trigger={
              <Button type="button" variant="outline" className="w-full h-9 border-dashed gap-2">
                <Plus className="h-4 w-4" />{label}
              </Button>
            }
          />
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── General ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="Summer Sale Bar" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Promotion Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {PROMOTION_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue("type", t, { shouldDirty: true })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                      type === t
                        ? "border-brand-500 bg-brand-500/10 text-brand-400"
                        : "border-border/50 hover:border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{TYPE_LABELS[t]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Priority <span className="text-muted-foreground text-xs">(0–100)</span></Label>
              <Input type="number" min={0} max={100} {...register("priority", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="datetime-local" {...register("startsAt")} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="datetime-local" {...register("endsAt")} className="text-sm" />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border/40">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive promotions are never shown</p>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Audience & Display ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Audience & Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Audience Target</Label>
            <select {...register("audienceTarget")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {AUDIENCE_TARGETS.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Display Pages <span className="text-muted-foreground text-xs">(where to show)</span></Label>
            <div className="flex flex-wrap gap-2">
              {DISPLAY_PAGES.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => togglePage(page)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    (displayPages ?? []).includes(page)
                      ? "border-brand-500 bg-brand-500/15 text-brand-400"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Announcement Bar ── */}
      {type === "ANNOUNCEMENT_BAR" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Announcement Bar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bar Text *</Label>
              <Input placeholder="Free shipping on orders above ₹499!" {...register("barText")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Icon / Emoji</Label>
                <Input placeholder="🚚" {...register("barIcon")} />
              </div>
              <div className="space-y-1.5">
                <Label>Position</Label>
                <select {...register("barPosition")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <input type="color" {...register("barBgColor")} className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input {...register("barBgColor")} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <input type="color" {...register("barTextColor")} className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input {...register("barTextColor")} className="flex-1" />
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CTA Text</Label>
                <Input placeholder="Shop Now" {...register("barCtaText")} />
              </div>
              <div className="space-y-1.5">
                <Label>CTA Link</Label>
                <Input placeholder="/products" {...register("barCtaLink")} />
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border/40">
              <div>
                <p className="text-sm font-medium">Dismissible</p>
                <p className="text-xs text-muted-foreground">User can close the bar</p>
              </div>
              <Controller
                control={control}
                name="barDismissible"
                render={({ field }) => (
                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Homepage Banner ── */}
      {type === "HOMEPAGE_BANNER" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Homepage Banner</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <MediaField field="desktopMediaId" label="Desktop Media" />
              <MediaField field="tabletMediaId"  label="Tablet Media" />
              <MediaField field="mobileMediaId"  label="Mobile Media" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Heading</Label>
                <Input placeholder="Summer Sale" {...register("heading")} />
              </div>
              <div className="space-y-1.5">
                <Label>Subheading</Label>
                <Input placeholder="Up to 40% off" {...register("subheading")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Short tagline…" {...register("description")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CTA Text</Label>
                <Input placeholder="Shop Now" {...register("ctaText")} />
              </div>
              <div className="space-y-1.5">
                <Label>CTA Link</Label>
                <Input placeholder="/products" {...register("ctaLink")} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Category / Product Banner ── */}
      {(type === "CATEGORY_BANNER" || type === "PRODUCT_BANNER") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{type === "CATEGORY_BANNER" ? "Category" : "Product"} Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MediaField field="mediaId" label="Banner Media" />
            <div className="space-y-1.5">
              <Label>Heading</Label>
              <Input placeholder="Limited Offer!" {...register("heading")} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} {...register("description")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CTA Text</Label>
                <Input {...register("ctaText")} />
              </div>
              <div className="space-y-1.5">
                <Label>CTA Link</Label>
                <Input {...register("ctaLink")} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Popup ── */}
      {type === "POPUP" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Popup Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Popup Type</Label>
                <select {...register("popupType")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {POPUP_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Show Behavior</Label>
                <select {...register("popupBehavior")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {POPUP_BEHAVIORS.map((b) => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            </div>
            <MediaField field="mediaId" label="Popup Media (Image / Video)" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Welcome!" {...register("heading")} />
              </div>
              <div className="space-y-1.5">
                <Label>Subtitle</Label>
                <Input placeholder="Get 10% off your first order" {...register("subheading")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} {...register("description")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CTA Text</Label>
                <Input placeholder="Claim Offer" {...register("ctaText")} />
              </div>
              <div className="space-y-1.5">
                <Label>CTA Link</Label>
                <Input placeholder="/products?coupon=WELCOME10" {...register("ctaLink")} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Delay (seconds)</Label>
                <Input type="number" min={0} {...register("popupDelaySeconds", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Scroll % trigger</Label>
                <Input type="number" min={0} max={100} {...register("popupScrollPercent", { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Floating Button ── */}
      {type === "FLOATING_BUTTON" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Floating Button</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Label Text</Label>
                <Input placeholder="Chat with us" {...register("floatText")} />
              </div>
              <div className="space-y-1.5">
                <Label>Icon / Emoji</Label>
                <Input placeholder="💬" {...register("floatIcon")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Link URL</Label>
              <Input placeholder="https://wa.me/919876543210" {...register("floatLink")} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <input type="color" {...register("floatBgColor")} className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input {...register("floatBgColor")} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <input type="color" {...register("floatTextColor")} className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input {...register("floatTextColor")} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Position</Label>
                <select {...register("floatPosition")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Countdown Campaign ── */}
      {type === "COUNTDOWN_CAMPAIGN" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Countdown Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <MediaField field="mediaId" label="Banner Media" />
            <div className="space-y-1.5">
              <Label>Heading</Label>
              <Input placeholder="Mega Sale — Ends Soon!" {...register("heading")} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} {...register("description")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CTA Text</Label>
                <Input {...register("ctaText")} />
              </div>
              <div className="space-y-1.5">
                <Label>CTA Link</Label>
                <Input {...register("ctaLink")} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Countdown Ends At *</Label>
                <Input type="datetime-local" {...register("countdownEndsAt")} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label>Timer Style</Label>
                <select {...register("countdownStyle")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="DIGITAL">Digital</option>
                  <option value="BLOCKS">Blocks</option>
                  <option value="MINIMAL">Minimal</option>
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Text Before Timer</Label>
                <Input placeholder="Sale ends in" {...register("countdownTextBefore")} />
              </div>
              <div className="space-y-1.5">
                <Label>Text After Timer</Label>
                <Input placeholder="Don't miss out!" {...register("countdownTextAfter")} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Category Targeting ── */}
      {(type === "CATEGORY_BANNER" || type === "POPUP") && (
        <Card>
          <CardHeader><CardTitle className="text-base">Category Targeting</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    (categoryIds ?? []).includes(cat.id)
                      ? "border-brand-500 bg-brand-500/15 text-brand-400"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">Loading categories…</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Leave empty to show for all categories.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Product Targeting ── */}
      {(type === "PRODUCT_BANNER" || type === "POPUP") && (
        <Card>
          <CardHeader><CardTitle className="text-base">Product Targeting</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {products.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => toggleProduct(prod.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    (productIds ?? []).includes(prod.id)
                      ? "border-brand-500 bg-brand-500/15 text-brand-400"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {prod.name}
                </button>
              ))}
              {products.length === 0 && (
                <p className="text-sm text-muted-foreground">Loading products…</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Leave empty to show for all products.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isEdit ? "Update Promotion" : "Create Promotion"}
        </Button>
      </div>
    </form>
  )
}
