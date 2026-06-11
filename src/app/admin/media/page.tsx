import { prisma } from "@/lib/prisma"
import MediaLibrary from "./media-library"

export default async function AdminMediaPage() {
  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 24 }),
    prisma.mediaAsset.count(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} asset{total !== 1 ? "s" : ""} stored</p>
        </div>
      </div>
      <MediaLibrary initialAssets={assets} initialTotal={total} />
    </div>
  )
}
