"use client"

import { ImagePlus, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import MediaPicker from "@/components/admin/media-picker"
import { cn } from "@/lib/utils"

type Preview = "dark" | "light" | "both"

interface Props {
  label: string
  description: string
  value: string
  onChange: (url: string) => void
  preview: Preview
  /** Preview height in px */
  height?: number
  error?: string
}

function PreviewBox({ url, tone, height, label }: { url: string; tone: "dark" | "light"; height: number; label: string }) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center rounded-lg border px-4 py-5 min-h-[88px]",
        tone === "dark" ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${label} preview`} style={{ height }} className="w-auto max-w-full object-contain" />
      ) : (
        <span className={cn("text-xs", tone === "dark" ? "text-zinc-500" : "text-zinc-400")}>
          Not set
        </span>
      )}
    </div>
  )
}

export function LogoField({ label, description, value, onChange, preview, height = 40, error }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {(preview === "dark" || preview === "both") && (
          <PreviewBox url={value} tone="dark" height={height} label={label} />
        )}
        {(preview === "light" || preview === "both") && (
          <PreviewBox url={value} tone="light" height={height} label={label} />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <MediaPicker
          accept="image"
          value={value || null}
          onSelect={(asset) => onChange(asset.secureUrl)}
          trigger={
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              {value ? <RefreshCw className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {value ? "Change" : "Upload / Choose"}
            </Button>
          }
        />
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => onChange("")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
