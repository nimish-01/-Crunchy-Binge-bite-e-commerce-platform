/**
 * Returns `path` only if it is a same-origin relative path; otherwise
 * `fallback`. Blocks absolute URLs, protocol-relative ("//evil.com") and
 * backslash tricks ("/\evil.com") that browsers treat as external.
 */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path || typeof path !== "string") return fallback
  if (!path.startsWith("/") || path.startsWith("//")) return fallback
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return fallback
  return path
}
