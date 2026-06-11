import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { deleteFromCloudinary } from "@/lib/cloudinary"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const asset = await prisma.mediaAsset.findUnique({ where: { id } })
  if (!asset) {
    return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 })
  }

  try {
    await deleteFromCloudinary(asset.publicId, asset.resourceType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cloudinary delete failed"
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }

  await prisma.mediaAsset.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const { altText } = body as { altText?: string }

  const asset = await prisma.mediaAsset.update({
    where: { id },
    data:  { altText: altText ?? null },
  })

  return NextResponse.json({ success: true, asset })
}
