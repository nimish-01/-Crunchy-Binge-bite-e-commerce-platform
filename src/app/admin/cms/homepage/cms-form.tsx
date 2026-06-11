"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { homepageCMSSchema, type HomepageCMSInput } from "@/lib/validations/homepage"
import type { HomepageCMS } from "@prisma/client"

interface Props { cms: HomepageCMS }

function Field({
  label, error, children, hint,
}: {
  label: string; error?: string; children: React.ReactNode; hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function VisibilityRow({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export default function CmsForm({ cms }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HomepageCMSInput>({
    resolver: zodResolver(homepageCMSSchema),
    defaultValues: {
      heroBadge:           cms.heroBadge,
      heroHeading:         cms.heroHeading,
      heroSubheading:      cms.heroSubheading,
      heroDescription:     cms.heroDescription,
      ctaText:             cms.ctaText,
      ctaLink:             cms.ctaLink,
      featuredTitle:       cms.featuredTitle,
      featuredBadge:       cms.featuredBadge,
      trendingTitle:       cms.trendingTitle,
      trendingBadge:       cms.trendingBadge,
      reviewsTitle:        cms.reviewsTitle,
      reviewsBadge:        cms.reviewsBadge,
      whyChooseTitle:      cms.whyChooseTitle,
      subscriptionTitle:   cms.subscriptionTitle,
      subscriptionSubtext: cms.subscriptionSubtext,
      subscriptionCtaText: cms.subscriptionCtaText,
      subscriptionCtaLink: cms.subscriptionCtaLink,
      showHero:            cms.showHero,
      showWhyChooseUs:     cms.showWhyChooseUs,
      showFeatured:        cms.showFeatured,
      showSubscription:    cms.showSubscription,
      showTrending:        cms.showTrending,
      showReviews:         cms.showReviews,
    },
  })

  async function onSubmit(data: HomepageCMSInput) {
    const res = await fetch("/api/admin/cms/homepage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) {
      toast({ title: "Save failed", description: json.error ?? "Unknown error", variant: "destructive" })
      return
    }
    toast({ title: "Homepage updated!", description: "Changes are live on the website." })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Tabs defaultValue="hero">
        <TabsList>
          <TabsTrigger value="hero">Default Hero</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="visibility">Visibility</TabsTrigger>
        </TabsList>

        {/* ── Default Hero (fallback when no slides) ───────────────── */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Default Hero</CardTitle>
              <CardDescription>Shown as fallback when no Hero Slides are active.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Badge Text" error={errors.heroBadge?.message}
                hint="Small label shown above the heading">
                <Input placeholder="🌾 Premium Makhana — Roasted Fresh" {...register("heroBadge")} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Heading *" error={errors.heroHeading?.message}
                  hint="Main headline (plain text)">
                  <Input placeholder="Snack Bold." {...register("heroHeading")} />
                </Field>
                <Field label="Subheading" error={errors.heroSubheading?.message}
                  hint="Highlighted gradient text after the heading">
                  <Input placeholder="Stay Fit." {...register("heroSubheading")} />
                </Field>
              </div>
              <Field label="Description *" error={errors.heroDescription?.message}>
                <Textarea rows={3} placeholder="Premium flavored makhana…" {...register("heroDescription")} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="CTA Button Text *" error={errors.ctaText?.message}>
                  <Input placeholder="Shop Now" {...register("ctaText")} />
                </Field>
                <Field label="CTA Button Link *" error={errors.ctaLink?.message}>
                  <Input placeholder="/products" {...register("ctaLink")} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sections ──────────────────────────────────────────────── */}
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle>Section Titles</CardTitle>
              <CardDescription>Headings and badge labels for each homepage section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Featured Products</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Title *" error={errors.featuredTitle?.message}>
                    <Input placeholder="Customer Favorites" {...register("featuredTitle")} />
                  </Field>
                  <Field label="Badge" error={errors.featuredBadge?.message}>
                    <Input placeholder="Bestsellers" {...register("featuredBadge")} />
                  </Field>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trending Products</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Title *" error={errors.trendingTitle?.message}>
                    <Input placeholder="New Arrivals" {...register("trendingTitle")} />
                  </Field>
                  <Field label="Badge" error={errors.trendingBadge?.message}>
                    <Input placeholder="Just In" {...register("trendingBadge")} />
                  </Field>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reviews</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Title *" error={errors.reviewsTitle?.message}>
                    <Input placeholder="What Customers Say" {...register("reviewsTitle")} />
                  </Field>
                  <Field label="Badge" error={errors.reviewsBadge?.message}>
                    <Input placeholder="Reviews" {...register("reviewsBadge")} />
                  </Field>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Why Choose Us</p>
                <Field label="Section Title *" error={errors.whyChooseTitle?.message}>
                  <Input placeholder="Why Choose Us" {...register("whyChooseTitle")} />
                </Field>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subscription Banner</p>
                <Field label="Heading" error={errors.subscriptionTitle?.message}>
                  <Input placeholder="Never Run Out Again" {...register("subscriptionTitle")} />
                </Field>
                <Field label="Description" error={errors.subscriptionSubtext?.message}>
                  <Textarea rows={2} placeholder="Subscribe & save up to 15%…" {...register("subscriptionSubtext")} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="CTA Text" error={errors.subscriptionCtaText?.message}>
                    <Input placeholder="Start Your Subscription" {...register("subscriptionCtaText")} />
                  </Field>
                  <Field label="CTA Link" error={errors.subscriptionCtaLink?.message}>
                    <Input placeholder="/products" {...register("subscriptionCtaLink")} />
                  </Field>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Visibility ────────────────────────────────────────────── */}
        <TabsContent value="visibility">
          <Card>
            <CardHeader>
              <CardTitle>Section Visibility</CardTitle>
              <CardDescription>Toggle sections on or off without deleting content.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              <VisibilityRow label="Hero Banner" description="Full-screen hero with CTA"
                checked={watch("showHero")} onChange={(v) => setValue("showHero", v, { shouldDirty: true })} />
              <VisibilityRow label="Why Choose Us" description="USP strip (Natural, High Protein, Hygienically Packed)"
                checked={watch("showWhyChooseUs")} onChange={(v) => setValue("showWhyChooseUs", v, { shouldDirty: true })} />
              <VisibilityRow label="Featured Products" description="Products marked as featured / bestsellers"
                checked={watch("showFeatured")} onChange={(v) => setValue("showFeatured", v, { shouldDirty: true })} />
              <VisibilityRow label="Subscription Banner" description="'Never Run Out Again' promo strip"
                checked={watch("showSubscription")} onChange={(v) => setValue("showSubscription", v, { shouldDirty: true })} />
              <VisibilityRow label="Trending Products" description="Newest product arrivals"
                checked={watch("showTrending")} onChange={(v) => setValue("showTrending", v, { shouldDirty: true })} />
              <VisibilityRow label="Reviews / Quotes" description="Customer testimonials section"
                checked={watch("showReviews")} onChange={(v) => setValue("showReviews", v, { shouldDirty: true })} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</>
          ) : (
            <><Save className="h-4 w-4 mr-1.5" />Save Homepage</>
          )}
        </Button>
      </div>
    </form>
  )
}
