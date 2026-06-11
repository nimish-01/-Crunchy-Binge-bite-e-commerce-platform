import { z } from "zod"

export const homepageCMSSchema = z.object({
  heroBadge:           z.string().default(""),
  heroHeading:         z.string().min(1, "Heading is required"),
  heroSubheading:      z.string().default(""),
  heroDescription:     z.string().min(1, "Description is required"),
  ctaText:             z.string().min(1, "CTA text is required"),
  ctaLink:             z.string().min(1, "CTA link is required"),

  featuredTitle:       z.string().min(1, "Title is required"),
  featuredBadge:       z.string().default(""),
  trendingTitle:       z.string().min(1, "Title is required"),
  trendingBadge:       z.string().default(""),
  reviewsTitle:        z.string().min(1, "Title is required"),
  reviewsBadge:        z.string().default(""),
  whyChooseTitle:      z.string().min(1, "Title is required"),

  subscriptionTitle:   z.string().default(""),
  subscriptionSubtext: z.string().default(""),
  subscriptionCtaText: z.string().default(""),
  subscriptionCtaLink: z.string().default(""),

  showHero:            z.boolean().default(true),
  showWhyChooseUs:     z.boolean().default(true),
  showFeatured:        z.boolean().default(true),
  showSubscription:    z.boolean().default(true),
  showTrending:        z.boolean().default(true),
  showReviews:         z.boolean().default(true),
})

export type HomepageCMSInput = z.infer<typeof homepageCMSSchema>

export const heroSlideSchema = z.object({
  heading:     z.string().default(""),
  subheading:  z.string().default(""),
  description: z.string().default(""),
  ctaText:     z.string().default(""),
  ctaLink:     z.string().default(""),
  mediaId:     z.string().nullable().optional(),
  isActive:    z.boolean().default(true),
  startsAt:    z.string().nullable().optional(),
  endsAt:      z.string().nullable().optional(),
})

export type HeroSlideInput = z.infer<typeof heroSlideSchema>

export const heroSlideReorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })),
})

export const homepageQuoteSchema = z.object({
  text:      z.string().min(10, "Quote must be at least 10 characters"),
  name:      z.string().min(2, "Name is required"),
  city:      z.string().min(2, "City is required"),
  rating:    z.number().int().min(1).max(5).default(5),
  sortOrder: z.number().int().default(0),
  isActive:  z.boolean().default(true),
})

export type HomepageQuoteInput = z.infer<typeof homepageQuoteSchema>
