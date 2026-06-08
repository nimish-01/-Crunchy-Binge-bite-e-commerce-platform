import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import type { UserRole, Prisma } from "@prisma/client"

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("changeRole"), role: z.enum(["CUSTOMER", "ADMIN", "INVENTORY_MANAGER", "SUPER_ADMIN"]) }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("deactivate") }),
])

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const adminSession = await requireAdmin()
  if (!isAdminSession(adminSession)) return adminSession

  const { id: targetUserId } = await params

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, isActive: true, tokenVersion: true },
  })
  if (!target) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  // SUPER_ADMIN accounts can only be modified by another SUPER_ADMIN
  if (target.role === "SUPER_ADMIN" && adminSession.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Cannot modify a SUPER_ADMIN account." }, { status: 403 })
  }

  let updateData: { role?: UserRole; isActive?: boolean; tokenVersion: number }
  let oldValue: Prisma.JsonObject
  let newValue: Prisma.JsonObject

  if (parsed.data.action === "changeRole") {
    oldValue = { role: target.role }
    newValue = { role: parsed.data.role }
    updateData = { role: parsed.data.role as UserRole, tokenVersion: target.tokenVersion + 1 }
  } else if (parsed.data.action === "activate") {
    if (target.isActive) {
      return NextResponse.json({ success: false, error: "User is already active." }, { status: 400 })
    }
    oldValue = { isActive: false }
    newValue = { isActive: true }
    updateData = { isActive: true, tokenVersion: target.tokenVersion + 1 }
  } else {
    if (!target.isActive) {
      return NextResponse.json({ success: false, error: "User is already inactive." }, { status: 400 })
    }
    oldValue = { isActive: true }
    newValue = { isActive: false }
    updateData = { isActive: false, tokenVersion: target.tokenVersion + 1 }
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        role: adminSession.role,
        action: parsed.data.action.toUpperCase(),
        module: "USER",
        entityType: "User",
        entityId: targetUserId,
        oldValue,
        newValue,
      },
    }),
  ])

  return NextResponse.json({ success: true, data: { user: updated } })
}
