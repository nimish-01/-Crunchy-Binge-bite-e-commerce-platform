/* eslint-disable @next/next/no-img-element -- print pages use plain <img> so logos render in print/PDF exactly as uploaded */
import type { SiteSettings } from "@prisma/client"
import { logoForLightBackground } from "@/lib/brand"

type Settings = Pick<SiteSettings, "companyName" | "logoUrl" | "logoLightUrl" | "logoMarkUrl"> | null

interface Props {
  settings: Settings
  /** Height of a full logo in px (an icon is drawn at ~70% of this) */
  height?: number
  /** Style for the company-name text (used with an icon or with no logo) */
  nameStyle?: React.CSSProperties
  nameClassName?: string
}

/**
 * Brand header for white/printed pages (invoice, packing slip). Uses the
 * admin's light-background logo; otherwise the icon + name; otherwise the name.
 */
export function PrintBrand({ settings, height = 40, nameStyle, nameClassName }: Props) {
  const name = settings?.companyName || "Crunchy Bingebite"
  const logo = logoForLightBackground(settings)

  if (logo?.kind === "full") {
    return <img src={logo.url} alt={name} style={{ height, width: "auto", maxWidth: 260, display: "block" }} />
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {logo && (
        <img
          src={logo.url}
          alt=""
          style={{ height: Math.round(height * 0.7), width: "auto", display: "block" }}
        />
      )}
      <p style={{ margin: 0, ...nameStyle }} className={nameClassName}>{name}</p>
    </div>
  )
}
