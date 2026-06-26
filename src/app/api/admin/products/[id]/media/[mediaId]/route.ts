import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

interface Context { params: Promise<{ id: string; mediaId: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session
  const { id, mediaId } = await params
  const body = await req.json().catch(() => ({}))
  const { isThumbnail, sortOrder } = body as { isThumbnail?: boolean; sortOrder?: number }

  if (isThumbnail === true) {
    await prisma.$transaction([
      prisma.productMedia.updateMany({ where: { productId: id }, data: { isThumbnail: false } }),
      prisma.productMedia.update({ where: { id: mediaId }, data: { isThumbnail: true } }),
    ])
  } else {
    const data: { sortOrder?: number; isThumbnail?: boolean } = {}
    if (typeof sortOrder === "number") data.sortOrder = sortOrder
    if (typeof isThumbnail === "boolean") data.isThumbnail = isThumbnail
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 })
    }
    await prisma.productMedia.update({ where: { id: mediaId }, data })
  }

  const updated = await prisma.productMedia.findUnique({
    where: { id: mediaId },
    include: {
      mediaAsset: {
        select: { id: true, secureUrl: true, thumbnailUrl: true, resourceType: true, altText: true },
      },
    },
  })
  return NextResponse.json({ success: true, media: updated })
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session
  const { id, mediaId } = await params

  const item = await prisma.productMedia.findUnique({ where: { id: mediaId } })
  if (!item) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.productMedia.delete({ where: { id: mediaId } })

  if (item.isThumbnail) {
    const next = await prisma.productMedia.findFirst({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    })
    if (next) {
      await prisma.productMedia.update({ where: { id: next.id }, data: { isThumbnail: true } })
    }
  }

  return NextResponse.json({ success: true })
}
