import { NextResponse } from "next/server"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"
import { uploadToCloudinary } from "@/lib/cloudinary"

export async function POST(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
  }

  const maxSize = 20 * 1024 * 1024 // 20 MB
  if (file.size > maxSize) {
    return NextResponse.json({ success: false, error: "File too large (max 20 MB)" }, { status: 400 })
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await uploadToCloudinary(buffer, {
    folder: "binge-bite/reviews",
    resource_type: file.type.startsWith("video/") ? "video" : "image",
  })

  return NextResponse.json({ success: true, url: result.secure_url, publicId: result.public_id })
}
