import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
  }
  return NextResponse.json({
    success: true,
    data: { notifications: [], unreadCount: 0, total: 0 },
  })
}
