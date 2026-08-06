import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

interface Context { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session
  const { id } = await params
  const media = await prisma.productMedia.findMany({
    where: { productId: id },
    include: {
      mediaAsset: {
        select: { id: true, secureUrl: true, thumbnailUrl: true, resourceType: true, altText: true, publicId: true },
      },
    },
    orderBy: [{ isThumbnail: "desc" }, { sortOrder: "asc" }],
  })
  return NextResponse.json({ success: true, media })
}

export async function POST(req: NextRequest, { params }: Context) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { mediaAssetId } = body as { mediaAssetId?: string }
  if (!mediaAssetId) return NextResponse.json({ success: false, error: "mediaAssetId required" }, { status: 400 })

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })

  // Idempotent: the picker lists every library asset, including ones already
  // attached, so re-selecting one must resolve gracefully rather than error.
  const existing = await prisma.productMedia.findUnique({
    where: { productId_mediaAssetId: { productId: id, mediaAssetId } },
    include: {
      mediaAsset: {
        select: { id: true, secureUrl: true, thumbnailUrl: true, resourceType: true, altText: true, publicId: true },
      },
    },
  })
  if (existing) return NextResponse.json({ success: true, media: existing, alreadyAttached: true })

  const mediaAsset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId }, select: { id: true } })
  if (!mediaAsset) return NextResponse.json({ success: false, error: "Media asset not found" }, { status: 404 })

  const count = await prisma.productMedia.count({ where: { productId: id } })
  const item = await prisma.productMedia.create({
    data: { productId: id, mediaAssetId, sortOrder: count, isThumbnail: count === 0 },
    include: {
      mediaAsset: {
        select: { id: true, secureUrl: true, thumbnailUrl: true, resourceType: true, altText: true, publicId: true },
      },
    },
  })
  return NextResponse.json({ success: true, media: item }, { status: 201 })
}
