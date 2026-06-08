import { z } from "zod"

export const productVariantSchema = z.object({
  weight: z.string().min(1, "Weight is required"),
  price: z.coerce.number().positive("Price must be positive"),
  mrp: z.coerce.number().positive("MRP must be positive"),
  sku: z.string().min(1, "SKU is required"),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  isActive: z.boolean().default(true),
})

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  shortDescription: z.string().max(200).optional(),
  categoryId: z.string().min(1, "Category is required"),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  allergenInfo: z.string().optional(),
  returnWindowDays: z.coerce.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isSubscriptionEligible: z.boolean().default(true),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
  variants: z.array(productVariantSchema).min(1, "At least one variant is required"),
})

export const categorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
})

export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
