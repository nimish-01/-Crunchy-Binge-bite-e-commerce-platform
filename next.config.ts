import type { NextConfig } from "next"
import path from "path"

const NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    localPatterns: [
      { pathname: "/uploads/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
      {
        source: "/inventory/:path*",
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
      {
        source: "/profile/:path*",
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
      {
        source: "/orders/:path*",
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
      {
        source: "/checkout/:path*",
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
    ]
  },
}

export default nextConfig
