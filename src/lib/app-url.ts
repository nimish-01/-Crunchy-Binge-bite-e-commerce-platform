/**
 * Canonical public origin for links that leave the app (e.g. emails).
 *
 * Production NEVER trusts the request's Host header here — otherwise a forged
 * Host could make a password-reset email point at an attacker's domain.
 * Set APP_URL to override the canonical origin (must be https).
 */
const PRODUCTION_ORIGIN = "https://www.crunchybingebite.com"

export function getAppOrigin(requestOrigin?: string): string {
  if (process.env.NODE_ENV === "production") {
    const configured = process.env.APP_URL
    if (configured) {
      try {
        const url = new URL(configured)
        if (url.protocol === "https:") return url.origin
      } catch {
        // invalid APP_URL → fall through to canonical origin
      }
    }
    return PRODUCTION_ORIGIN
  }

  // Development: use the origin the developer is actually running on
  return requestOrigin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
