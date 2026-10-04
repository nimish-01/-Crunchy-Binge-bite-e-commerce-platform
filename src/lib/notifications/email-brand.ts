import type { SiteSettings } from "@prisma/client"
import { getSiteSettings } from "@/lib/settings"
import { emailSafeImageUrl, logoForDarkBackground } from "@/lib/brand"

// templates.ts wraps the header brand line in these markers
const BRAND_BLOCK = /<!--brand-->[\s\S]*?<!--\/brand-->/

const FULL_HEIGHT = 44
const MARK_HEIGHT = 36

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/**
 * Swaps the text brand line in an email for the admin-uploaded logo.
 * The email header is dark, so the main (dark-background) logo is used,
 * falling back to the icon + name. Returns html unchanged if no logo is set.
 */
export function brandEmailHtml(
  html: string,
  settings: Pick<SiteSettings, "companyName" | "logoUrl" | "logoLightUrl" | "logoMarkUrl"> | null
): string {
  if (!BRAND_BLOCK.test(html)) return html
  const logo = logoForDarkBackground(settings)
  if (!logo) return html

  const height = logo.kind === "full" ? FULL_HEIGHT : MARK_HEIGHT
  const src = emailSafeImageUrl(logo.url, height)
  if (!src) return html

  const name = escapeAttr(settings?.companyName || "Crunchy Bingebite")
  const img = `<img src="${escapeAttr(src)}" alt="${name}" height="${height}" style="display:block;height:${height}px;width:auto;max-width:260px;border:0;outline:none;text-decoration:none;"/>`

  const block = logo.kind === "full"
    ? img
    : `<table cellpadding="0" cellspacing="0" role="presentation"><tr>
<td style="padding-right:10px;vertical-align:middle;">${img}</td>
<td style="vertical-align:middle;"><p style="margin:0;font-size:22px;font-weight:700;color:#f59e0b;">${name}</p></td>
</tr></table>`

  return html.replace(BRAND_BLOCK, block)
}

/** Never throws — if settings can't be read, the email keeps its text header. */
export async function applyEmailBrand(html: string): Promise<string> {
  try {
    return brandEmailHtml(html, await getSiteSettings())
  } catch {
    return html
  }
}
