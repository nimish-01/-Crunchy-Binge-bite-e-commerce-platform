import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  let dbStatus: "ok" | "error" = "ok"
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbStatus = "error"
  }

  const status = dbStatus === "ok" ? "ok" : "degraded"

  return NextResponse.json(
    {
      status,
      db: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    },
    { status: status === "ok" ? 200 : 503 }
  )
}
