import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin, isInventoryManager } from "@/lib/rbac"
import type { UserRole } from "@prisma/client"

export type AdminSession = {
  userId: string
  role: UserRole
}

export type InventorySession = {
  userId: string
  role: UserRole
}

async function checkUserActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  })
  return user?.isActive ?? false
}

export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
  }
  const role = session.user.role as UserRole
  if (!isAdmin(role)) {
    return NextResponse.json({ success: false, error: "Access denied. Admin role required." }, { status: 403 })
  }
  // Real-time isActive check — catches deactivated accounts before JWT expiry
  const active = await checkUserActive(session.user.id)
  if (!active) {
    return NextResponse.json({ success: false, error: "Account deactivated." }, { status: 401 })
  }
  return { userId: session.user.id, role }
}

export async function requireInventoryAccess(): Promise<InventorySession | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
  }
  const role = session.user.role as UserRole
  if (!isInventoryManager(role)) {
    return NextResponse.json({ success: false, error: "Access denied. Inventory access required." }, { status: 403 })
  }
  // Real-time isActive check
  const active = await checkUserActive(session.user.id)
  if (!active) {
    return NextResponse.json({ success: false, error: "Account deactivated." }, { status: 401 })
  }
  return { userId: session.user.id, role }
}

export function isAdminSession(val: AdminSession | NextResponse): val is AdminSession {
  return !(val instanceof NextResponse)
}

export function isInventorySession(val: InventorySession | NextResponse): val is InventorySession {
  return !(val instanceof NextResponse)
}
