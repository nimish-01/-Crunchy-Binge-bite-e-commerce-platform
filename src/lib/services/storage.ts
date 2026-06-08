/**
 * Storage Service — abstraction layer.
 * Current implementation: local filesystem under public/uploads/.
 * To upgrade: replace LocalStorageService with CloudinaryStorageService.
 */

import fs from "fs/promises"
import path from "path"
import type { UploadResult } from "@/types"

export interface IStorageService {
  upload(file: Buffer, filename: string, mimeType: string): Promise<UploadResult>
  delete(publicId: string): Promise<void>
  getUrl(publicId: string): string
}

// ─── Local Filesystem Implementation ────────────────────────────────────────

class LocalStorageService implements IStorageService {
  private readonly uploadDir: string
  private readonly baseUrl: string

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads")
    this.baseUrl = process.env.UPLOAD_BASE_URL ?? "/uploads"
  }

  async upload(file: Buffer, filename: string, _mimeType: string): Promise<UploadResult> {
    const ext = filename.split(".").pop() ?? "jpg"
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = path.join(this.uploadDir, uniqueName)

    await fs.mkdir(this.uploadDir, { recursive: true })
    await fs.writeFile(filePath, file)

    return {
      url: `${this.baseUrl}/${uniqueName}`,
      publicId: uniqueName,
    }
  }

  async delete(publicId: string): Promise<void> {
    const filePath = path.join(this.uploadDir, publicId)
    try {
      await fs.unlink(filePath)
    } catch {
      // File not found — ignore
    }
  }

  getUrl(publicId: string): string {
    return `${this.baseUrl}/${publicId}`
  }
}

// ─── Future: Cloudinary Implementation ──────────────────────────────────────
// class CloudinaryStorageService implements IStorageService { ... }

export const storageService: IStorageService = new LocalStorageService()
