import { z } from "zod"

export const mediaListQuerySchema = z.object({
  search:       z.string().optional(),
  resourceType: z.enum(["image", "video", "all"]).default("all"),
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(50).default(24),
  folder:       z.string().optional(),
})

export type MediaListQuery = z.infer<typeof mediaListQuerySchema>

export const mediaUploadMetaSchema = z.object({
  altText: z.string().max(200).optional(),
  tags:    z.string().optional(),
  folder:  z.string().default("binge-bite"),
})

export type MediaUploadMeta = z.infer<typeof mediaUploadMetaSchema>
