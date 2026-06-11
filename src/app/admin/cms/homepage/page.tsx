import { prisma } from "@/lib/prisma"
import CmsForm from "./cms-form"
import QuotesManager from "./quotes-manager"
import HeroSlidesManager from "./hero-slides"

export default async function HomepageCMSPage() {
  const [cms, quotes, slides] = await Promise.all([
    prisma.homepageCMS.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    }),
    prisma.homepageQuote.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.heroSlide.findMany({
      include: { media: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Homepage CMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage hero slides, section titles, visibility, and customer quotes.
        </p>
      </div>
      <HeroSlidesManager initialSlides={slides} />
      <CmsForm cms={cms} />
      <QuotesManager initialQuotes={quotes} />
    </div>
  )
}
