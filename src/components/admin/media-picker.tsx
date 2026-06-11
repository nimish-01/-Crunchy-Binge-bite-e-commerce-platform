"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import { Image as ImageIcon, Video, Search, Upload, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { MediaAsset } from "@prisma/client"

type Filter = "all" | "image" | "video"

interface Props {
  /** Called with the chosen asset when user clicks Select */
  onSelect: (asset: MediaAsset) => void
  /** Restrict to images, videos, or all (default: all) */
  accept?: Filter
  /** Render prop for the trigger. Defaults to a simple button. */
  trigger?: React.ReactNode
  /** Current value shown as thumbnail */
  value?: string | null
}

export default function MediaPicker({ onSelect, accept = "all", trigger, value }: Props) {
  const [open, setOpen]           = useState(false)
  const [assets, setAssets]       = useState<MediaAsset[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [filter, setFilter]       = useState<Filter>(accept === "all" ? "all" : accept)
  const [search, setSearch]       = useState("")
  const [loading, setLoading]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected]   = useState<MediaAsset | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const LIMIT = 18
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchAssets = useCallback(
    async (p: number, f: Filter, q: string) => {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(p), limit: String(LIMIT), resourceType: f,
        ...(q ? { search: q } : {}),
      })
      const res = await fetch(`/api/admin/media?${params}`)
      const json = await res.json()
      if (json.success) { setAssets(json.assets); setTotal(json.pagination.total) }
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => { setPage(1); fetchAssets(1, filter, search) }, 300)
    return () => clearTimeout(t)
  }, [search, filter, open, fetchAssets])

  useEffect(() => { if (open) fetchAssets(page, filter, search) }, [page])

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "binge-bite")
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!json.success) toast({ title: `Upload failed: ${file.name}`, variant: "destructive" })
    }
    setUploading(false)
    fetchAssets(1, filter, search)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleSelect(asset: MediaAsset) {
    if (selected?.id === asset.id) {
      setSelected(null)
    } else {
      setSelected(asset)
    }
  }

  function handleConfirm() {
    if (!selected) return
    onSelect(selected)
    setOpen(false)
    setSelected(null)
  }

  const defaultTrigger = (
    <Button variant="outline" type="button" className="gap-2">
      {value ? (
        <Image src={value} alt="" width={20} height={20} className="rounded object-cover" unoptimized />
      ) : (
        <ImageIcon className="h-4 w-4" />
      )}
      {value ? "Change Media" : "Select Media"}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {accept === "all" && (
            <div className="flex gap-1">
              {(["all", "image", "video"] as Filter[]).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "brand" : "outline"}
                  onClick={() => setFilter(f)} className="capitalize px-2.5"
                >{f}</Button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <input ref={fileRef} type="file" multiple hidden
            accept={accept === "video" ? "video/*" : accept === "image" ? "image/*" : "image/*,video/*"}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <ImageIcon className="h-8 w-8" />
              <p className="text-sm">No media found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-1">
              {assets.map((asset) => {
                const isSelected = selected?.id === asset.id
                const thumb = asset.thumbnailUrl || asset.secureUrl
                return (
                  <div
                    key={asset.id}
                    className={cn(
                      "relative aspect-video rounded-md border-2 cursor-pointer overflow-hidden bg-muted/40 transition-all",
                      isSelected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-transparent hover:border-border"
                    )}
                    onClick={() => handleSelect(asset)}
                  >
                    <Image src={thumb || ""} alt={asset.altText || ""} fill className="object-cover" unoptimized />
                    {asset.resourceType === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="h-5 w-5 text-white drop-shadow" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination + confirm */}
        <div className="flex items-center justify-between shrink-0 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {totalPages > 1 && (
              <>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="disabled:opacity-30">‹</button>
                <span>{page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="disabled:opacity-30">›</button>
              </>
            )}
            <span>{total} asset{total !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="brand" onClick={handleConfirm} disabled={!selected}>
              Select{selected ? ` (${selected.publicId.split("/").pop()?.slice(0, 20)})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
