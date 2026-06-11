import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { uploadToCloudinary, getThumbnailUrl, detectResourceType } from "@/lib/cloudinary"
import { mediaUploadMetaSchema } from "@/lib/validations/media"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
  }

  const MAX_SIZE = 100 * 1024 * 1024 // 100 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: "File exceeds 100 MB limit" }, { status: 413 })
  }

  const meta = mediaUploadMetaSchema.safeParse({
    altText: formData.get("altText") ?? undefined,
    tags:    formData.get("tags") ?? undefined,
    folder:  formData.get("folder") ?? "binge-bite",
  })
  if (!meta.success) {
    return NextResponse.json({ success: false, error: meta.error.flatten() }, { status: 400 })
  }

  const resourceType = detectResourceType(file.type)
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  let uploaded
  try {
    uploaded = await uploadToCloudinary(buffer, {
      resource_type: resourceType,
      folder: meta.data.folder,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    })
  } catch (err) {
    const msg = err instanceof Error
      ? err.message
      : (typeof err === "object" && err !== null && "message" in err)
        ? String((err as Record<string, unknown>).message)
        : "Cloudinary upload failed"
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }

  const thumbnailUrl = getThumbnailUrl(uploaded.public_id, resourceType)
  const tagList = meta.data.tags
    ? meta.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : []

  const asset = await prisma.mediaAsset.create({
    data: {
      publicId:     uploaded.public_id,
      secureUrl:    uploaded.secure_url,
      thumbnailUrl,
      resourceType,
      format:       uploaded.format ?? file.type.split("/")[1] ?? "unknown",
      bytes:        uploaded.bytes,
      width:        uploaded.width ?? null,
      height:       uploaded.height ?? null,
      folder:       meta.data.folder,
      altText:      meta.data.altText ?? null,
      tags:         tagList,
      createdBy:    session.userId,
    },
  })

  return NextResponse.json({ success: true, asset }, { status: 201 })
}
