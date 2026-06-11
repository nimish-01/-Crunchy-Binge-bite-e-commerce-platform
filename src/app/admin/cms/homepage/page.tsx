import { prisma } from "@/lib/prisma"
import CmsForm from "./cms-form"
import QuotesManager from "./quotes-manager"

export default async function HomepageCMSPage() {
  const [cms, quotes] = await Promise.all([
    prisma.homepageCMS.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    }),
    prisma.homepageQuote.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Homepage CMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage hero content, section titles, visibility, and customer quotes.
        </p>
      </div>
      <CmsForm cms={cms} />
      <QuotesManager initialQuotes={quotes} />
    </div>
  )
}
