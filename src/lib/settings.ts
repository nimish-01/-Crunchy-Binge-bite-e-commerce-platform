import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

export const getSiteSettings = unstable_cache(
  async () => {
    return prisma.siteSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    })
  },
  ["site-settings"],
  { tags: ["site-settings"] }
)
