import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

const ADMIN_LOGIN = "/admin/login"
const INVENTORY_LOGIN = "/inventory/login"
const ACCOUNT_ROUTES = ["/profile", "/orders", "/wishlist", "/notifications", "/checkout"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const role = session?.user?.role as string | undefined
  const isActive = session?.user?.isActive

  // Propagate pathname to server-component layouts via request headers
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", pathname)
  const passthrough = NextResponse.next({ request: { headers: requestHeaders } })

  // Always allow dedicated login pages through — layouts check x-pathname to skip auth gate
  if (pathname === ADMIN_LOGIN || pathname === INVENTORY_LOGIN) {
    return passthrough
  }

  // ─── Admin routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, req.url))
    }
    if (isActive === false) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN + "?error=deactivated", req.url))
    }
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      // INVENTORY_MANAGER → send to their dashboard; CUSTOMER → home
      const dest = role === "INVENTORY_MANAGER" ? "/inventory" : "/"
      return NextResponse.redirect(new URL(dest, req.url))
    }
  }

  // ─── Inventory routes ────────────────────────────────────────────────────────
  if (pathname.startsWith("/inventory")) {
    if (!session) {
      return NextResponse.redirect(new URL(INVENTORY_LOGIN, req.url))
    }
    if (isActive === false) {
      return NextResponse.redirect(new URL(INVENTORY_LOGIN + "?error=deactivated", req.url))
    }
    if (role !== "INVENTORY_MANAGER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // ─── Customer account routes ─────────────────────────────────────────────────
  if (ACCOUNT_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!session || isActive === false) {
      return NextResponse.redirect(
        new URL("/login?callbackUrl=" + encodeURIComponent(pathname), req.url)
      )
    }
  }

  return passthrough
})

export const config = {
  matcher: [
    "/admin/:path*",
    "/inventory/:path*",
    "/profile",
    "/profile/:path*",
    "/orders",
    "/orders/:path*",
    "/wishlist",
    "/wishlist/:path*",
    "/notifications",
    "/notifications/:path*",
    "/checkout",
    "/checkout/:path*",
  ],
}
