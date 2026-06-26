import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"

export async function GET(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { searchParams } = new URL(req.url)
  const page  = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = 20

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: session.user.id } }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ])

  return NextResponse.json({
    success: true,
    notifications,
    unreadCount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
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

  await prisma.notification.deleteMany({
    where: { id, userId: session.user.id },
  })

  return NextResponse.json({ success: true })
}
