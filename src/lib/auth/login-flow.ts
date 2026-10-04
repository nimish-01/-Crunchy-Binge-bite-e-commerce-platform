// Client-safe helpers shared by the customer login and OTP verification pages.

// The email being verified is kept in tab-scoped sessionStorage rather than
// the URL, so it never lands in browser history, logs or Referer headers.
const PENDING_OTP_KEY = "bb-otp-pending"

export interface PendingOtp {
  email: string
  sentAt: number
  expiresInSeconds: number
  resendCooldownSeconds: number
}

export function savePendingOtp(pending: PendingOtp) {
  try {
    sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(pending))
  } catch {
    // storage unavailable — verify page will send the user back to login
  }
}

export function readPendingOtp(): PendingOtp | null {
  try {
    const raw = sessionStorage.getItem(PENDING_OTP_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<PendingOtp>
    if (typeof p.email !== "string" || typeof p.sentAt !== "number") return null
    return {
      email: p.email,
      sentAt: p.sentAt,
      expiresInSeconds: p.expiresInSeconds ?? 300,
      resendCooldownSeconds: p.resendCooldownSeconds ?? 60,
    }
  } catch {
    return null
  }
}

export function clearPendingOtp() {
  try {
    sessionStorage.removeItem(PENDING_OTP_KEY)
  } catch {
    // ignore
  }
}

/** "john.doe@gmail.com" → "j***@gmail.com" */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@")
  if (at < 1) return email
  return `${email[0]}***${email.slice(at)}`
}

/** Role-aware post-login destination (callbackUrl must already be sanitized). */
export function postLoginDestination(role: string | undefined, callbackUrl: string): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return callbackUrl.startsWith("/admin") ? callbackUrl : "/admin"
  }
  if (role === "INVENTORY_MANAGER") {
    return callbackUrl.startsWith("/inventory") ? callbackUrl : "/inventory"
  }
  return callbackUrl
}
