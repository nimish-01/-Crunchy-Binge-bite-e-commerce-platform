import { z } from "zod"

const optUrl = z
  .string()
  .refine((v) => !v || z.string().url().safeParse(v).success, {
    message: "Must be a valid URL (e.g. https://facebook.com/yourbrand)",
  })

const optEmail = z
  .string()
  .refine((v) => !v || z.string().email().safeParse(v).success, {
    message: "Must be a valid email address",
  })

export const siteSettingsSchema = z.object({
  companyName:     z.string().min(1, "Company name is required"),
  tagline:         z.string().default(""),
  aboutText:       z.string().default(""),
  supportEmail:    optEmail,
  supportPhone:    z.string().default(""),
  whatsappNumber:  z.string().default(""),
  facebook:        optUrl,
  instagram:       optUrl,
  linkedin:        optUrl,
  twitter:         optUrl,
  youtube:         optUrl,
  footerText:      z.string().default(""),
  copyrightText:   z.string().default(""),
  gstNumber:       z.string().default(""),
  businessAddress: z.string().default(""),
  googleMapsLink:  optUrl,
})

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>
