import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession, requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function GET(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit  = 20
  const filter = searchParams.get("filter") // "all" | "unread" | "read"
  const search = searchParams.get("q") ?? ""

  const where: Record<string, unknown> = { userId: session.user.id }
  if (filter === "unread") where.isRead = false
  if (filter === "read")   where.isRead = true
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body:  { contains: search, mode: "insensitive" } },
    ]
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ])

  return NextResponse.json({
    success: true,
    notifications,
    unreadCount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const { target, title, body: message, type = "GENERAL" } = body as {
    target: string; title: string; body: string; type?: string
  }

  if (!title || !message) {
    return NextResponse.json({ success: false, error: "title and body are required" }, { status: 400 })
  }

  let userIds: string[] = []

  if (target === "ALL") {
    const users = await prisma.user.findMany({ where: { role: "CUSTOMER", isActive: true }, select: { id: true } })
    userIds = users.map((u) => u.id)
  } else if (target === "ADMINS") {
    const users = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true }, select: { id: true } })
    userIds = users.map((u) => u.id)
  } else if (target === "INVENTORY") {
    const users = await prisma.user.findMany({ where: { role: "INVENTORY_MANAGER", isActive: true }, select: { id: true } })
    userIds = users.map((u) => u.id)
  } else if (target === "ALL_USERS") {
    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } })
    userIds = users.map((u) => u.id)
  } else if (target === "SPECIFIC" && body.userIds) {
    userIds = body.userIds as string[]
  }

  if (!userIds.length) {
    return NextResponse.json({ success: false, error: "No recipients found" }, { status: 400 })
  }

  const BATCH = 500
  for (let i = 0; i < userIds.length; i += BATCH) {
    await prisma.notification.createMany({
      data: userIds.slice(i, i + BATCH).map((userId) => ({
        userId,
        type: "GENERAL" as const,
        title,
        body: message,
        referenceType: type,
      })),
    })
  }

  return NextResponse.json({ success: true, data: { count: userIds.length } })
}

export async function PATCH(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const body = await req.json()

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: session.user.id },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: "Provide id or all:true" }, { status: 400 })
}

export async function DELETE(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })

  await prisma.notification.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
