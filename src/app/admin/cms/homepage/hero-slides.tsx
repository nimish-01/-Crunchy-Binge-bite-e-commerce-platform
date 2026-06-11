"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2,
  Eye, EyeOff, GripVertical, Calendar, Image as ImageIcon, Video, FileImage,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { heroSlideSchema, type HeroSlideInput } from "@/lib/validations/homepage"
import MediaPicker from "@/components/admin/media-picker"
import type { HeroSlide, MediaAsset } from "@prisma/client"

type SlideWithMedia = HeroSlide & { media: MediaAsset | null }

function toLocalDatetime(d: Date | string | null): string {
  if (!d) return ""
  const dt = new Date(d)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

function mediaTypeIcon(resourceType: string | undefined) {
  if (!resourceType) return <ImageIcon className="h-4 w-4" />
  if (resourceType === "video") return <Video className="h-4 w-4" />
  return <ImageIcon className="h-4 w-4" />
}

function SlideForm({
  slide,
  onSave,
  onClose,
}: {
  slide: Partial<SlideWithMedia> | null
  onSave: (data: HeroSlideInput & { id?: string }) => Promise<void>
  onClose: () => void
}) {
  const { toast } = useToast()
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(
    slide?.media ?? null
  )

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<HeroSlideInput>({
      resolver: zodResolver(heroSlideSchema),
      defaultValues: {
        heading:     slide?.heading     ?? "",
        subheading:  slide?.subheading  ?? "",
        description: slide?.description ?? "",
        ctaText:     slide?.ctaText     ?? "",
        ctaLink:     slide?.ctaLink     ?? "",
        mediaId:     slide?.mediaId     ?? null,
        isActive:    slide?.isActive    ?? true,
        startsAt:    slide?.startsAt    ? toLocalDatetime(slide.startsAt) : "",
        endsAt:      slide?.endsAt      ? toLocalDatetime(slide.endsAt)   : "",
      },
    })

  function handleMediaSelect(asset: MediaAsset) {
    setSelectedMedia(asset)
    setValue("mediaId", asset.id, { shouldDirty: true })
  }

  function handleMediaRemove() {
    setSelectedMedia(null)
    setValue("mediaId", null, { shouldDirty: true })
  }

  async function onSubmit(data: HeroSlideInput) {
    try {
      await onSave({ ...data, id: slide?.id })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    }
  }

  const isActive = watch("isActive")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Media picker */}
      <div className="space-y-2">
        <Label>Hero Media</Label>
        {selectedMedia ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
            <div className="relative h-16 w-24 rounded overflow-hidden bg-muted shrink-0">
              {selectedMedia.resourceType === "video" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                  <Video className="h-6 w-6 text-white" />
                </div>
              ) : (
                <Image
                  src={selectedMedia.thumbnailUrl || selectedMedia.secureUrl}
                  alt={selectedMedia.altText || ""}
                  fill className="object-cover" unoptimized
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedMedia.publicId.split("/").pop()}</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedMedia.resourceType} · {selectedMedia.format.toUpperCase()}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <MediaPicker
                onSelect={handleMediaSelect}
                trigger={<Button type="button" variant="outline" size="sm">Change</Button>}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleMediaRemove}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border/50">
            <FileImage className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">No media selected — slide shows gradient background</p>
            </div>
            <MediaPicker
              onSelect={handleMediaSelect}
              trigger={<Button type="button" variant="outline" size="sm">Select Media</Button>}
            />
          </div>
        )}
      </div>

      {/* Text fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Heading</Label>
          <Input placeholder="Snack Bold." {...register("heading")} />
          {errors.heading && <p className="text-xs text-destructive">{errors.heading.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Subheading <span className="text-muted-foreground">(gradient)</span></Label>
          <Input placeholder="Stay Fit." {...register("subheading")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea rows={2} placeholder="Short tagline or body copy…" {...register("description")} />
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

      {/* Schedule */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Schedule <span className="text-muted-foreground font-normal">(optional)</span></span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Show from</Label>
            <Input type="datetime-local" {...register("startsAt")} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Hide after</Label>
            <Input type="datetime-local" {...register("endsAt")} className="text-sm" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Leave both empty to always show (when active).</p>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between py-2 border-t border-border/40">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">Inactive slides are hidden on the homepage</p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="brand" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Slide"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function HeroSlidesManager({ initialSlides }: { initialSlides: SlideWithMedia[] }) {
  const [slides, setSlides] = useState<SlideWithMedia[]>(initialSlides)
  const [dialogSlide, setDialogSlide] = useState<Partial<SlideWithMedia> | null | false>(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  const isOpen = dialogSlide !== false

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/cms/hero")
    const json = await res.json()
    if (json.success) setSlides(json.slides)
  }, [])

  async function handleSave(data: HeroSlideInput & { id?: string }) {
    const { id, ...body } = data
    const url    = id ? `/api/admin/cms/hero/${id}` : "/api/admin/cms/hero"
    const method = id ? "PATCH" : "POST"

    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? "Save failed")

    toast({ title: id ? "Slide updated" : "Slide created" })
    setDialogSlide(false)
    await reload()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this slide permanently?")) return
    setDeleting(id)
    const res  = await fetch(`/api/admin/cms/hero/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (!json.success) {
      toast({ title: "Delete failed", variant: "destructive" })
    } else {
      toast({ title: "Slide deleted" })
      setSlides((prev) => prev.filter((s) => s.id !== id))
    }
    setDeleting(null)
  }

  async function handleToggle(slide: SlideWithMedia) {
    const res  = await fetch(`/api/admin/cms/hero/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !slide.isActive }),
    })
    const json = await res.json()
    if (json.success) setSlides((prev) => prev.map((s) => s.id === slide.id ? json.slide : s))
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= slides.length) return

    const reordered = [...slides]
    ;[reordered[index], reordered[next]] = [reordered[next], reordered[index]]
    setSlides(reordered)

    const items = reordered.map((s, i) => ({ id: s.id, sortOrder: i }))
    await fetch("/api/admin/cms/hero/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
  }

  function slideStatus(s: SlideWithMedia) {
    if (!s.isActive) return { label: "Disabled", variant: "secondary" as const }
    const now = new Date()
    if (s.startsAt && new Date(s.startsAt) > now) return { label: "Scheduled", variant: "outline" as const }
    if (s.endsAt   && new Date(s.endsAt)   < now) return { label: "Expired",   variant: "destructive" as const }
    return { label: "Live", variant: "brand" as const }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Hero Slides</CardTitle>
          <CardDescription>
            Slides are shown as a carousel. Inactive or expired slides are hidden.
          </CardDescription>
        </div>
        <Button variant="brand" size="sm" onClick={() => setDialogSlide(null)}>
          <Plus className="h-4 w-4 mr-1.5" />Add Slide
        </Button>
      </CardHeader>

      <CardContent className="space-y-2">
        {slides.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border/50 p-10 text-center">
            <FileImage className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No slides yet — the homepage will use the Default Hero fallback.</p>
            <Button variant="outline" onClick={() => setDialogSlide(null)}>
              <Plus className="h-4 w-4 mr-1.5" />Add your first slide
            </Button>
          </div>
        ) : (
          slides.map((slide, i) => {
            const status = slideStatus(slide)
            const thumb  = slide.media?.thumbnailUrl || slide.media?.secureUrl
            return (
              <div
                key={slide.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 hover:border-brand-500/30 transition-colors"
              >
                {/* Drag handle indicator */}
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

                {/* Thumbnail */}
                <div className="relative h-14 w-20 rounded overflow-hidden bg-muted shrink-0">
                  {slide.media ? (
                    slide.media.resourceType === "video" ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                        <Video className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <Image src={thumb!} alt="" fill className="object-cover" unoptimized />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-2xl">🌾</div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">
                      {slide.heading || <span className="text-muted-foreground italic">No heading</span>}
                      {slide.subheading && <span className="text-brand-400"> {slide.subheading}</span>}
                    </p>
                    <Badge variant={status.variant} className="text-xs shrink-0">{status.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {slide.media && (
                      <span className="flex items-center gap-1">
                        {mediaTypeIcon(slide.media.resourceType)}
                        {slide.media.resourceType}
                      </span>
                    )}
                    {slide.startsAt && (
                      <span>From {new Date(slide.startsAt).toLocaleDateString()}</span>
                    )}
                    {slide.endsAt && (
                      <span>Until {new Date(slide.endsAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => handleMove(i, -1)} disabled={i === 0}
                    title="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => handleMove(i, 1)} disabled={i === slides.length - 1}
                    title="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => handleToggle(slide)}
                    title={slide.isActive ? "Disable" : "Enable"}
                  >
                    {slide.isActive
                      ? <Eye className="h-3.5 w-3.5 text-brand-400" />
                      : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => setDialogSlide(slide)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className={cn("h-7 w-7 hover:text-destructive hover:bg-destructive/10", deleting === slide.id && "opacity-50")}
                    onClick={() => handleDelete(slide.id)}
                    disabled={deleting === slide.id}
                    title="Delete"
                  >
                    {deleting === slide.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) setDialogSlide(false) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogSlide && "id" in dialogSlide && dialogSlide.id ? "Edit Slide" : "Add New Slide"}</DialogTitle>
          </DialogHeader>
          {isOpen && (
            <SlideForm
              slide={dialogSlide || null}
              onSave={handleSave}
              onClose={() => setDialogSlide(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
