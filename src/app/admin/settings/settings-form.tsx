"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validations/settings"
import type { SiteSettings } from "@prisma/client"

interface Props {
  settings: SiteSettings
}

function Field({
  label, error, children, hint,
}: {
  label: string
  error?: string
  children: React.ReactNode
  hint?: string
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

export default function SettingsForm({ settings }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      companyName:     settings.companyName,
      tagline:         settings.tagline,
      aboutText:       settings.aboutText,
      supportEmail:    settings.supportEmail,
      supportPhone:    settings.supportPhone,
      whatsappNumber:  settings.whatsappNumber,
      facebook:        settings.facebook,
      instagram:       settings.instagram,
      linkedin:        settings.linkedin,
      twitter:         settings.twitter,
      youtube:         settings.youtube,
      footerText:      settings.footerText,
      copyrightText:   settings.copyrightText,
      gstNumber:       settings.gstNumber,
      businessAddress: settings.businessAddress,
      googleMapsLink:  settings.googleMapsLink,
    },
  })

  async function onSubmit(data: SiteSettingsInput) {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) {
      toast({ title: "Failed to save", description: json.error ?? "Unknown error", variant: "destructive" })
      return
    }
    toast({ title: "Settings saved!", description: "Website updated successfully." })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="company">
        <TabsList className="mb-4">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        {/* ── Company ─────────────────────────────────────────────── */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Company Name *" error={errors.companyName?.message}>
                <Input placeholder="Crunchy Bingebite" {...register("companyName")} />
              </Field>
              <Field label="Tagline" error={errors.tagline?.message}>
                <Input placeholder="Premium flavored makhana…" {...register("tagline")} />
              </Field>
              <Field label="About Text" error={errors.aboutText?.message}>
                <Textarea rows={4} placeholder="Tell customers about your brand…" {...register("aboutText")} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Support Email" error={errors.supportEmail?.message}>
                  <Input type="email" placeholder="support@bingebite.in" {...register("supportEmail")} />
                </Field>
                <Field label="Support Phone" error={errors.supportPhone?.message}>
                  <Input placeholder="+91 98765 43210" {...register("supportPhone")} />
                </Field>
                <Field
                  label="WhatsApp Number"
                  error={errors.whatsappNumber?.message}
                  hint="Include country code, e.g. +919876543210"
                >
                  <Input placeholder="+919876543210" {...register("whatsappNumber")} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Social Media ─────────────────────────────────────────── */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  { key: "facebook",  label: "Facebook",   placeholder: "https://facebook.com/bingebite" },
                  { key: "instagram", label: "Instagram",  placeholder: "https://instagram.com/bingebite" },
                  { key: "linkedin",  label: "LinkedIn",   placeholder: "https://linkedin.com/company/bingebite" },
                  { key: "twitter",   label: "Twitter / X", placeholder: "https://x.com/bingebite" },
                  { key: "youtube",   label: "YouTube",    placeholder: "https://youtube.com/@bingebite" },
                ] as const
              ).map(({ key, label, placeholder }) => (
                <Field key={key} label={label} error={errors[key]?.message}>
                  <Input placeholder={placeholder} {...register(key)} />
                </Field>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>Footer Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Footer Tagline"
                error={errors.footerText?.message}
                hint="Shown below your brand name in the footer."
              >
                <Textarea
                  rows={3}
                  placeholder="Premium flavored makhana. Roasted to perfection…"
                  {...register("footerText")}
                />
              </Field>
              <Field
                label="Copyright Text"
                error={errors.copyrightText?.message}
                hint="Replaces the default '© Year Company Name. All rights reserved.' Leave blank to use the default."
              >
                <Input placeholder="© 2025 Crunchy Bingebite. All rights reserved." {...register("copyrightText")} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Business ─────────────────────────────────────────────── */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="GST Number" error={errors.gstNumber?.message}>
                <Input placeholder="22AAAAA0000A1Z5" {...register("gstNumber")} />
              </Field>
              <Field label="Business Address" error={errors.businessAddress?.message}>
                <Textarea rows={3} placeholder="123, Street, City, State — 400001" {...register("businessAddress")} />
              </Field>
              <Field label="Google Maps Link" error={errors.googleMapsLink?.message}>
                <Input placeholder="https://maps.google.com/?q=…" {...register("googleMapsLink")} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</>
          ) : (
            <><Save className="h-4 w-4 mr-1.5" />Save Settings</>
          )}
        </Button>
      </div>
    </form>
  )
}
