import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

export const getHeroSlides = unstable_cache(
  async () => {
    const now = new Date()
    return prisma.heroSlide.findMany({
      where: {
        isActive: true,
        OR: [
          { startsAt: null,           endsAt: null },
          { startsAt: { lte: now },   endsAt: null },
          { startsAt: null,           endsAt: { gte: now } },
          { startsAt: { lte: now },   endsAt: { gte: now } },
        ],
      },
      include: { media: true },
      orderBy: { sortOrder: "asc" },
    })
  },
  ["hero-slides"],
  { tags: ["hero-slides"] }
)

export const getHomepageCMS = unstable_cache(
  async () => {
    return prisma.homepageCMS.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    })
  },
  ["homepage-cms"],
  { tags: ["homepage-cms"] }
)

export const getHomepageQuotes = unstable_cache(
  async () => {
    return prisma.homepageQuote.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })
  },
  ["homepage-quotes"],
  { tags: ["homepage-cms"] }
)
