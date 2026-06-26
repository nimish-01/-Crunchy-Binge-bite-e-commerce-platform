import { z } from "zod"

export const reviewSchema = z.object({
  productId:   z.string().min(1),
  rating:      z.number().int().min(1).max(5),
  title:       z.string().max(120).optional().default(""),
  body:        z.string().max(2000).optional().default(""),
  images:      z.array(z.string().url()).max(5).default([]),
  videos:      z.array(z.string().url()).max(2).default([]),
  isAnonymous: z.boolean().default(false),
})
export type ReviewInput = z.infer<typeof reviewSchema>

export const reviewUpdateSchema = z.object({
  rating:      z.number().int().min(1).max(5).optional(),
  title:       z.string().max(120).optional(),
  body:        z.string().max(2000).optional(),
  images:      z.array(z.string().url()).max(5).optional(),
  videos:      z.array(z.string().url()).max(2).optional(),
  isAnonymous: z.boolean().optional(),
})

export const reviewModerateSchema = z.object({
  status:        z.enum(["APPROVED", "REJECTED", "HIDDEN"]).optional(),
  isFeatured:    z.boolean().optional(),
  adminResponse: z.string().max(1000).optional(),
})

export const walletCreditSchema = z.object({
  amount:      z.number().positive(),
  description: z.string().min(1),
  refType:     z.string().optional(),
  refId:       z.string().optional(),
})

export const loyaltyAdjustSchema = z.object({
  points:      z.number().int(),
  description: z.string().min(1),
})

export const loyaltySettingsSchema = z.object({
  pointsPerRupee:         z.number().positive().max(100),
  redemptionRate:         z.number().positive().max(10),
  maxRedemptionPercent:   z.number().min(1).max(100),
  reviewPoints:           z.number().int().min(0).max(1000),
  referralReferrerPoints: z.number().int().min(0).max(1000),
  referralRefereePoints:  z.number().int().min(0).max(1000),
  birthdayPoints:         z.number().int().min(0).max(5000),
})

export const wishlistCollectionSchema = z.object({
  name:     z.string().min(1).max(60),
  isPublic: z.boolean().default(false),
})
