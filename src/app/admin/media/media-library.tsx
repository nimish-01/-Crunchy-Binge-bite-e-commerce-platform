"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import {
  Upload, Search, Trash2, X, Image as ImageIcon, Video, Eye,
  ChevronLeft, ChevronRight, Loader2, FileWarning, Copy, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { MediaAsset } from "@prisma/client"

const LIMIT = 24

interface Props {
  initialAssets: MediaAsset[]
  initialTotal:  number
}

type Filter = "all" | "image" | "video"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AssetCard({
  asset,
  onDelete,
  onPreview,
}: {
  asset: MediaAsset
  onDelete: (id: string) => void
  onPreview: (asset: MediaAsset) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Delete this asset permanently from Cloudinary and database?")) return
    setDeleting(true)
    const res = await fetch(`/api/admin/media/${asset.id}`, { method: "DELETE" })
    const json = await res.json()
    if (!json.success) {
      toast({ title: "Delete failed", description: json.error, variant: "destructive" })
      setDeleting(false)
      return
    }
    onDelete(asset.id)
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(asset.secureUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const thumb = asset.thumbnailUrl || asset.secureUrl

  return (
    <div
      className="group relative rounded-lg border border-border/50 bg-card overflow-hidden cursor-pointer hover:border-brand-500/50 transition-colors"
      onClick={() => onPreview(asset)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted/40 flex items-center justify-center">
        {asset.resourceType === "video" ? (
          <>
            {thumb ? (
              <Image src={thumb} alt={asset.altText || asset.publicId} fill className="object-cover" unoptimized />
            ) : (
              <Video className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-black/60 flex items-center justify-center">
                <Video className="h-5 w-5 text-white" />
              </div>
            </div>
          </>
        ) : (
          <Image src={thumb} alt={asset.altText || asset.publicId} fill className="object-cover" unoptimized />
        )}
        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onPreview(asset) }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            size="icon" variant="destructive" className="h-8 w-8"
            onClick={handleDelete} disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium truncate">{asset.publicId.split("/").pop()}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(asset.bytes)} · {asset.format.toUpperCase()}</p>
      </div>
    </div>
  )
}

function PreviewDialog({
  asset,
  onClose,
  onDelete,
}: {
  asset: MediaAsset | null
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  if (!asset) return null

  function handleCopy() {
    navigator.clipboard.writeText(asset!.secureUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!confirm("Delete this asset permanently?")) return
    const res = await fetch(`/api/admin/media/${asset!.id}`, { method: "DELETE" })
    const json = await res.json()
    if (!json.success) { toast({ title: "Delete failed", variant: "destructive" }); return }
    onDelete(asset!.id)
    onClose()
  }

  return (
    <Dialog open={!!asset} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{asset.publicId.split("/").pop()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center min-h-48 max-h-80">
            {asset.resourceType === "video" ? (
              <video src={asset.secureUrl} controls className="max-h-80 w-full" />
            ) : (
              <Image
                src={asset.secureUrl} alt={asset.altText || asset.publicId}
                width={asset.width || 800} height={asset.height || 600}
                className="object-contain max-h-80" unoptimized
              />
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{asset.resourceType}</p></div>
            <div><span className="text-muted-foreground">Format</span><p className="font-medium uppercase">{asset.format}</p></div>
            <div><span className="text-muted-foreground">Size</span><p className="font-medium">{formatBytes(asset.bytes)}</p></div>
            {asset.width && asset.height && (
              <div><span className="text-muted-foreground">Dimensions</span><p className="font-medium">{asset.width}×{asset.height}</p></div>
            )}
            <div><span className="text-muted-foreground">Folder</span><p className="font-medium font-mono text-xs">{asset.folder}</p></div>
            {asset.altText && (
              <div className="col-span-2"><span className="text-muted-foreground">Alt text</span><p className="font-medium">{asset.altText}</p></div>
            )}
            {asset.tags.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {asset.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              </div>
            )}
          </div>

          {/* URL */}
          <div className="flex gap-2">
            <Input readOnly value={asset.secureUrl} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" />Delete Asset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function MediaLibrary({ initialAssets, initialTotal }: Props) {
  const [assets, setAssets]       = useState<MediaAsset[]>(initialAssets)
  const [total, setTotal]         = useState(initialTotal)
  const [page, setPage]           = useState(1)
  const [filter, setFilter]       = useState<Filter>("all")
  const [search, setSearch]       = useState("")
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [preview, setPreview]     = useState<MediaAsset | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchAssets = useCallback(
    async (p: number, f: Filter, q: string) => {
      setSearching(true)
      const params = new URLSearchParams({
        page:         String(p),
        limit:        String(LIMIT),
        resourceType: f,
        ...(q ? { search: q } : {}),
      })
      const res = await fetch(`/api/admin/media?${params}`)
      const json = await res.json()
      if (json.success) {
        setAssets(json.assets)
        setTotal(json.pagination.total)
      }
      setSearching(false)
    },
    []
  )

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchAssets(1, filter, search)
    }, 350)
    return () => clearTimeout(t)
  }, [search, filter, fetchAssets])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    let uploaded = 0
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "binge-bite")
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (json.success) {
        uploaded++
        setUploadPct(Math.round((uploaded / files.length) * 100))
      } else {
        toast({ title: `Failed: ${file.name}`, description: json.error, variant: "destructive" })
      }
    }
    setUploading(false)
    setUploadPct(0)
    if (uploaded > 0) {
      toast({ title: `${uploaded} file${uploaded > 1 ? "s" : ""} uploaded!` })
      setPage(1)
      fetchAssets(1, filter, search)
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleDelete(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id))
    setTotal((t) => t - 1)
  }

  function changePage(p: number) {
    setPage(p)
    fetchAssets(p, filter, search)
  }

  // Drag and drop
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleUpload(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, tags, folder…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 shrink-0">
          {(["all", "image", "video"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "brand" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === "all" ? "All" : f === "image" ? <><ImageIcon className="h-3.5 w-3.5 mr-1" />Images</> : <><Video className="h-3.5 w-3.5 mr-1" />Videos</>}
            </Button>
          ))}
        </div>

        {/* Upload button */}
        <Button
          variant="brand"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Uploading {uploadPct}%</>
          ) : (
            <><Upload className="h-4 w-4 mr-1.5" />Upload</>
          )}
        </Button>
        <input
          ref={fileRef} type="file" multiple hidden
          accept="image/*,video/*"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Drop zone hint when empty */}
      {assets.length === 0 && !searching ? (
        <div
          className="rounded-xl border-2 border-dashed border-border/50 p-16 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <FileWarning className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            {search || filter !== "all"
              ? "No assets match your filters."
              : "No media uploaded yet. Drop files here or click Upload."}
          </p>
          {!search && filter === "all" && (
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />Upload your first file
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Grid */}
          <div
            className={cn(
              "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3",
              searching && "opacity-60 pointer-events-none"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Drop-zone upload card */}
            <div
              className="rounded-lg border-2 border-dashed border-border/50 aspect-video flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors text-muted-foreground"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.stopPropagation(); handleDrop(e) }}
            >
              <Upload className="h-5 w-5" />
              <span className="text-xs">Upload</span>
            </div>

            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDelete}
                onPreview={setPreview}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} assets
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => changePage(page - 1)} disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => changePage(page + 1)} disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {searching && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Preview dialog */}
      <PreviewDialog asset={preview} onClose={() => setPreview(null)} onDelete={handleDelete} />
    </div>
  )
}
