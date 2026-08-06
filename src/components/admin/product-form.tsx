"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, Loader2, Star, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { productSchema, type ProductInput } from "@/lib/validations/product"
import { slugify, getDiscountPercent } from "@/lib/utils"
import type { Category, Product, ProductVariant } from "@/types"
import { cn } from "@/lib/utils"

interface Props {
  categories: Category[]
  product?: Product & { variants: ProductVariant[] }
}

export default function ProductForm({ categories, product }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!product

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      shortDescription: product.shortDescription ?? "",
      categoryId: product.categoryId,
      tags: product.tags,
      dietaryTags: product.dietaryTags,
      allergenInfo: product.allergenInfo ?? "",
      returnWindowDays: product.returnWindowDays ?? 0,
      isFeatured: product.isFeatured,
      isSubscriptionEligible: product.isSubscriptionEligible,
      status: product.status as "ACTIVE" | "DRAFT" | "ARCHIVED",
      images: product.images,
      seoTitle: product.seoTitle ?? "",
      seoDesc: product.seoDesc ?? "",
      variants: product.variants.map((v) => ({
        weight: v.weight, price: v.price, mrp: v.mrp, sku: v.sku,
        stock: v.stock, lowStockThreshold: v.lowStockThreshold, isActive: v.isActive,
        isDefault: v.isDefault, sortOrder: v.sortOrder,
      })),
    } : {
      name: "", slug: "", description: "", shortDescription: "", categoryId: "",
      tags: [], dietaryTags: [], images: [], seoTitle: "", seoDesc: "",
      variants: [{ weight: "", price: 0, mrp: 0, sku: "", stock: 0, lowStockThreshold: 10, isActive: true, isDefault: true, sortOrder: 0 }],
      isFeatured: false, isSubscriptionEligible: true, status: "DRAFT",
    },
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: "variants" })
  const nameValue = watch("name")
  const returnWindowValue = watch("returnWindowDays") ?? 0
  const variantValues = watch("variants")
  const tagsValue = watch("tags")
  const dietaryTagsValue = watch("dietaryTags")
  const RETURN_PRESETS = [7, 10, 14, 30]
  const isCustomReturn = returnWindowValue > 0 && !RETURN_PRESETS.includes(returnWindowValue)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  function handleNameBlur() {
    if (!isEdit) setValue("slug", slugify(nameValue))
  }

  function setDefaultVariant(index: number) {
    fields.forEach((_, i) => setValue(`variants.${i}.isDefault`, i === index))
  }

  function addVariant() {
    append({
      weight: "", price: 0, mrp: 0, sku: "", stock: 0, lowStockThreshold: 10,
      isActive: true, isDefault: fields.length === 0, sortOrder: fields.length,
    })
  }

  function confirmRemoveVariant() {
    if (removeIndex === null) return
    const removingDefault = variantValues?.[removeIndex]?.isDefault
    remove(removeIndex)
    if (removingDefault) {
      // Someone still has to be the default — promote the new first row.
      setTimeout(() => setValue("variants.0.isDefault", true), 0)
    }
    setRemoveIndex(null)
  }

  async function onSubmit(data: ProductInput) {
    // sortOrder always mirrors the on-screen order — no manual field needed.
    const payload = { ...data, variants: data.variants.map((v, i) => ({ ...v, sortOrder: i })) }
    const url = isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products"
    const method = isEdit ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!json.success) { toast({ title: json.error ?? "Failed", variant: "destructive" }); return }
    toast({ title: isEdit ? "Product updated" : "Product created", variant: "default" })
    if (isEdit) {
      router.push("/admin/products")
    } else {
      // New products have no images yet — send the admin straight to the
      // gallery instead of a list → click-edit round trip.
      router.push(`/admin/products/${json.data.product.id}/edit`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input placeholder="Himalayan Salt Makhana" {...register("name")} onBlur={handleNameBlur} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL) *</Label>
              <Input placeholder="himalayan-salt-makhana" {...register("slug")} />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input placeholder="One-line product summary" {...register("shortDescription")} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Full product description..." rows={4} {...register("description")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select defaultValue={product?.categoryId} onValueChange={(v) => setValue("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={product?.status ?? "DRAFT"} onValueChange={(v) => setValue("status", v as "ACTIVE" | "DRAFT" | "ARCHIVED")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Switch id="featured" defaultChecked={product?.isFeatured} onCheckedChange={(v) => setValue("isFeatured", v)} />
              <Label htmlFor="featured">Featured (Bestseller)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="subscription" defaultChecked={product?.isSubscriptionEligible ?? true} onCheckedChange={(v) => setValue("isSubscriptionEligible", v)} />
              <Label htmlFor="subscription">Subscription Eligible</Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Allergen Info</Label>
            <Input placeholder="Contains tree nuts, May contain traces of..." {...register("allergenInfo")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input
                placeholder="protein, roasted, gift-pack"
                defaultValue={tagsValue?.join(", ")}
                onBlur={(e) => setValue("tags", e.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))}
              />
              <p className="text-xs text-muted-foreground">Comma-separated — used by search and category chips.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Dietary Tags</Label>
              <Input
                placeholder="vegan, gluten-free, no-sugar-added"
                defaultValue={dietaryTagsValue?.join(", ")}
                onBlur={(e) => setValue("dietaryTags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
              />
              <p className="text-xs text-muted-foreground">Comma-separated — shown as badges on the product page.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Return Policy</Label>
            <div className="flex flex-wrap gap-2">
              {/* No Return */}
              <button
                type="button"
                onClick={() => setValue("returnWindowDays", 0, { shouldValidate: true })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  returnWindowValue === 0
                    ? "bg-destructive/15 border-destructive/50 text-destructive"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                No Return
              </button>

              {/* Preset chips */}
              {RETURN_PRESETS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setValue("returnWindowDays", days, { shouldValidate: true })}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    returnWindowValue === days
                      ? "bg-brand-500/15 border-brand-500/50 text-brand-400"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {days} days
                </button>
              ))}

              {/* Custom chip */}
              <button
                type="button"
                onClick={() => setValue("returnWindowDays", isCustomReturn ? returnWindowValue : 1, { shouldValidate: true })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  isCustomReturn
                    ? "bg-brand-500/15 border-brand-500/50 text-brand-400"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom number input — shown when neither 0 nor a preset */}
            {isCustomReturn && (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 21"
                  className="w-32"
                  {...register("returnWindowDays")}
                />
                <span className="text-sm text-muted-foreground">days after delivery</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {returnWindowValue === 0
                ? "Customers cannot request returns for this product."
                : `Customers can request a return within ${returnWindowValue} days of delivery.`}
            </p>
            {errors.returnWindowDays && <p className="text-xs text-destructive">{errors.returnWindowDays.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Meta Title</Label>
            <Input placeholder="Defaults to the product name if left blank" {...register("seoTitle")} />
          </div>
          <div className="space-y-1.5">
            <Label>Meta Description</Label>
            <Textarea placeholder="Defaults to the short description if left blank" rows={2} {...register("seoDesc")} />
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variants (Weight / SKU)</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            <Plus className="h-4 w-4" />Add Variant
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, i) => {
            const v = variantValues?.[i]
            const discount = v?.price && v?.mrp ? getDiscountPercent(Number(v.price), Number(v.mrp)) : 0
            const priceError = errors.variants?.[i]?.price
            return (
              <div key={field.id} className={cn(
                "rounded-lg border p-4 space-y-3",
                v?.isDefault ? "border-brand-500/50 bg-brand-500/5" : "border-border/50"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">Variant {i + 1}</p>
                    {v?.isDefault && (
                      <span className="text-[10px] bg-brand-500 text-zinc-950 font-bold px-1.5 py-0.5 rounded">DEFAULT</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Set as default — this is what's shown on listing, homepage, and search cards"
                      className={v?.isDefault ? "text-brand-400" : "text-muted-foreground"}
                      onClick={() => setDefaultVariant(i)}
                    >
                      <Star className={cn("h-4 w-4", v?.isDefault && "fill-current")} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" title="Move down" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1.5 px-2">
                      <Switch
                        id={`variant-active-${field.id}`}
                        defaultChecked={v?.isActive ?? true}
                        onCheckedChange={(checked) => setValue(`variants.${i}.isActive`, checked)}
                      />
                      <Label htmlFor={`variant-active-${field.id}`} className="text-xs text-muted-foreground">Active</Label>
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setRemoveIndex(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Weight *</Label>
                    <Input placeholder="100g" {...register(`variants.${i}.weight`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price (₹) *</Label>
                    <Input type="number" placeholder="149" {...register(`variants.${i}.price`)} />
                    {priceError && <p className="text-xs text-destructive">{priceError.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>MRP (₹) *</Label>
                    <Input type="number" placeholder="199" {...register(`variants.${i}.mrp`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>SKU *</Label>
                    <Input placeholder="BB-HIM-100G" {...register(`variants.${i}.sku`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stock</Label>
                    <Input type="number" placeholder="100" {...register(`variants.${i}.stock`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Low Stock Alert</Label>
                    <Input type="number" placeholder="10" {...register(`variants.${i}.lowStockThreshold`)} />
                  </div>
                </div>
                {discount > 0 && (
                  <p className="text-xs text-muted-foreground">Customers will see <span className="text-green-500 font-medium">{discount}% OFF</span></p>
                )}
              </div>
            )
          })}
          {errors.variants && <p className="text-xs text-destructive">{errors.variants.root?.message ?? errors.variants.message}</p>}
        </CardContent>
      </Card>

      <Dialog open={removeIndex !== null} onOpenChange={(open) => !open && setRemoveIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Variant</DialogTitle>
            <DialogDescription>
              Remove Variant {removeIndex !== null ? removeIndex + 1 : ""}? If it has no past orders this deletes it
              permanently on save; if it has order history it will be deactivated instead. This can&apos;t be undone from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveIndex(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemoveVariant}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 sticky bottom-0 md:static -mx-4 sm:mx-0 px-4 sm:px-0 py-3 md:py-0 pb-safe md:pb-0 bg-background/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-border/50 md:border-0 z-10">
        <Button type="submit" variant="brand" disabled={isSubmitting} className="flex-1 sm:flex-initial">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />{isEdit ? "Saving…" : "Creating…"}</> : isEdit ? "Save Changes" : "Create Product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>Cancel</Button>
      </div>
    </form>
  )
}
