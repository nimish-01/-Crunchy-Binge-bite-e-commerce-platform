import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

const CACHEABLE_TYPES = [
  "ANNOUNCEMENT_BAR",
  "HOMEPAGE_BANNER",
  "CATEGORY_BANNER",
  "PRODUCT_BANNER",
  "POPUP",
  "FLOATING_BUTTON",
  "COUNTDOWN_CAMPAIGN",
]

function isCurrentlyActive(promo: { startsAt: Date | null; endsAt: Date | null }): boolean {
  const now = new Date()
  if (promo.startsAt && promo.startsAt > now) return false
  if (promo.endsAt   && promo.endsAt   < now) return false
  return true
}

const fetchActivePromotions = unstable_cache(
  async (type?: string, displayPage?: string, categoryId?: string, productId?: string) => {
    const typeFilter = type && CACHEABLE_TYPES.includes(type) ? { type: type as never } : {}

    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        ...typeFilter,
        ...(displayPage ? { displayPages: { has: displayPage } } : {}),
        ...(categoryId
          ? { categories: { some: { categoryId } } }
          : {}),
        ...(productId
          ? { products: { some: { productId } } }
          : {}),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    })

    // Filter by schedule client-side (unstable_cache can't use dynamic Date inside)
    const active = promotions.filter(isCurrentlyActive)

    // Collect all media IDs from configs for batch resolve
    const mediaIds = new Set<string>()
    for (const p of active) {
      const c = (p.config ?? {}) as Record<string, unknown>
      if (c.mediaId)        mediaIds.add(c.mediaId as string)
      if (c.desktopMediaId) mediaIds.add(c.desktopMediaId as string)
      if (c.tabletMediaId)  mediaIds.add(c.tabletMediaId as string)
      if (c.mobileMediaId)  mediaIds.add(c.mobileMediaId as string)
    }

    const mediaAssets = mediaIds.size
      ? await prisma.mediaAsset.findMany({ where: { id: { in: [...mediaIds] } } })
      : []
    const mediaMap = Object.fromEntries(mediaAssets.map((m) => [m.id, m]))

    // Enrich config with resolved media
    return active.map((p) => {
      const c = (p.config ?? {}) as Record<string, unknown>
      const enriched: Record<string, unknown> = { ...c }
      if (c.mediaId)        enriched.media        = mediaMap[c.mediaId as string]        ?? null
      if (c.desktopMediaId) enriched.desktopMedia = mediaMap[c.desktopMediaId as string] ?? null
      if (c.tabletMediaId)  enriched.tabletMedia  = mediaMap[c.tabletMediaId as string]  ?? null
      if (c.mobileMediaId)  enriched.mobileMedia  = mediaMap[c.mobileMediaId as string]  ?? null
      return { ...p, config: enriched }
    })
  },
  ["active-promotions"],
  { tags: ["promotions"], revalidate: 60 }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type        = searchParams.get("type")        ?? undefined
  const displayPage = searchParams.get("page")        ?? undefined
  const categoryId  = searchParams.get("categoryId")  ?? undefined
  const productId   = searchParams.get("productId")   ?? undefined

  const promotions = await fetchActivePromotions(type, displayPage, categoryId, productId)
  return NextResponse.json({ success: true, promotions })
}
