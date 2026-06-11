import { v2 as cloudinary } from "cloudinary"
import type { UploadApiOptions, UploadApiResponse } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})

export { cloudinary }

export async function uploadToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error)
      if (result) return resolve(result)
      reject(new Error("No result returned from Cloudinary"))
    })
    stream.end(buffer)
  })
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: string = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType as "image" | "video" | "raw",
  })
}

export function getOptimizedUrl(publicId: string, width?: number): string {
  return cloudinary.url(publicId, {
    quality: "auto",
    fetch_format: "auto",
    ...(width ? { width, crop: "limit" } : {}),
  })
}

export function getThumbnailUrl(publicId: string, resourceType: string): string {
  if (resourceType === "video") {
    return cloudinary.url(publicId, {
      resource_type: "video",
      format: "jpg",
      quality: "auto",
      width: 400,
      height: 300,
      crop: "fill",
      start_offset: "0",
    } as UploadApiOptions)
  }
  return cloudinary.url(publicId, {
    quality: "auto",
    fetch_format: "auto",
    width: 400,
    height: 300,
    crop: "fill",
  })
}

export function getVideoOptimizedUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: "video",
    quality: "auto",
    fetch_format: "auto",
  } as UploadApiOptions)
}

export function detectResourceType(mimeType: string): "image" | "video" | "raw" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("image/")) return "image"
  return "raw"
}
