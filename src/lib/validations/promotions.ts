import { z } from "zod"

export const PROMOTION_TYPES = [
  "ANNOUNCEMENT_BAR",
  "HOMEPAGE_BANNER",
  "CATEGORY_BANNER",
  "PRODUCT_BANNER",
  "POPUP",
  "FLOATING_BUTTON",
  "COUNTDOWN_CAMPAIGN",
] as const

export const POPUP_TYPES = [
  "WELCOME",
  "COUPON",
  "EXIT_INTENT",
  "NEWSLETTER",
  "FESTIVAL",
  "CUSTOM",
] as const

export const POPUP_BEHAVIORS = [
  "ONCE_PER_SESSION",
  "ONCE_PER_DAY",
  "EVERY_VISIT",
  "AFTER_X_SECONDS",
  "EXIT_INTENT",
  "SCROLL_PERCENT",
] as const

export const AUDIENCE_TARGETS = [
  "ALL_VISITORS",
  "LOGGED_IN",
  "GUESTS",
  "NEW_CUSTOMERS",
  "RETURNING_CUSTOMERS",
] as const

export const DISPLAY_PAGES = [
  "homepage",
  "product",
  "category",
  "cart",
  "checkout",
  "account",
] as const

// ── Config schemas per promotion type ────────────────────────────────────────

export const announcementBarConfigSchema = z.object({
  text: z.string().min(1, "Bar text is required"),
  icon: z.string().optional().default(""),
  bgColor: z.string().default("#f59e0b"),
  textColor: z.string().default("#000000"),
  position: z.enum(["top", "bottom"]).default("top"),
  dismissible: z.boolean().default(true),
  ctaText: z.string().optional().default(""),
  ctaLink: z.string().optional().default(""),
})

export const homepageBannerConfigSchema = z.object({
  desktopMediaId: z.string().nullable().optional(),
  tabletMediaId: z.string().nullable().optional(),
  mobileMediaId: z.string().nullable().optional(),
  heading: z.string().optional().default(""),
  subheading: z.string().optional().default(""),
  description: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaLink: z.string().optional().default(""),
})

export const bannerConfigSchema = z.object({
  mediaId: z.string().nullable().optional(),
  heading: z.string().optional().default(""),
  description: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaLink: z.string().optional().default(""),
})

export const popupConfigSchema = z.object({
  popupType: z.enum(POPUP_TYPES).default("WELCOME"),
  mediaId: z.string().nullable().optional(),
  title: z.string().optional().default(""),
  subtitle: z.string().optional().default(""),
  description: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaLink: z.string().optional().default(""),
  behavior: z.enum(POPUP_BEHAVIORS).default("ONCE_PER_SESSION"),
  delaySeconds: z.number().int().min(0).default(0),
  scrollPercent: z.number().int().min(0).max(100).default(50),
})

export const floatingButtonConfigSchema = z.object({
  text: z.string().optional().default(""),
  icon: z.string().optional().default("💬"),
  link: z.string().optional().default(""),
  bgColor: z.string().default("#25D366"),
  textColor: z.string().default("#ffffff"),
  position: z.enum(["bottom-right", "bottom-left", "bottom-center"]).default("bottom-right"),
})

export const countdownConfigSchema = z.object({
  mediaId: z.string().nullable().optional(),
  heading: z.string().optional().default(""),
  description: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaLink: z.string().optional().default(""),
  countdownEndsAt: z.string().optional().default(""),
  countdownStyle: z.enum(["DIGITAL", "BLOCKS", "MINIMAL"]).default("DIGITAL"),
  textBefore: z.string().optional().default("Sale ends in"),
  textAfter: z.string().optional().default(""),
})

// ── Main promotion schema ─────────────────────────────────────────────────────

export const promotionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(PROMOTION_TYPES),
  isActive: z.boolean().default(false),
  priority: z.number().int().min(0).max(100).default(0),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  audienceTarget: z.enum(AUDIENCE_TARGETS).default("ALL_VISITORS"),
  displayPages: z.array(z.enum(DISPLAY_PAGES)).default([]),
  categoryIds: z.array(z.string()).default([]),
  productIds: z.array(z.string()).default([]),
  config: z.record(z.unknown()).default({}),
})

export type PromotionInput = z.infer<typeof promotionSchema>

// ── Analytics event ───────────────────────────────────────────────────────────

export const analyticsEventSchema = z.object({
  event: z.enum(["impression", "click"]),
})
