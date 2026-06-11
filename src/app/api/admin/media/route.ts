import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { mediaListQuerySchema } from "@/lib/validations/media"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const parsed = mediaListQuerySchema.safeParse({
    search:       searchParams.get("search") ?? undefined,
    resourceType: searchParams.get("resourceType") ?? "all",
    page:         searchParams.get("page") ?? "1",
    limit:        searchParams.get("limit") ?? "24",
    folder:       searchParams.get("folder") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { search, resourceType, page, limit, folder } = parsed.data
  const skip = (page - 1) * limit

  const where = {
    ...(resourceType !== "all" ? { resourceType } : {}),
    ...(folder ? { folder } : {}),
    ...(search
      ? {
          OR: [
            { publicId:  { contains: search, mode: "insensitive" as const } },
            { altText:   { contains: search, mode: "insensitive" as const } },
            { tags:      { has: search } },
            { folder:    { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.mediaAsset.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    assets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}
