import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

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
