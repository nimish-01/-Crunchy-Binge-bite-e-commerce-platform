import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { isSuperAdmin } from "@/lib/rbac"
import { siteSettingsSchema } from "@/lib/validations/settings"

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  })
  return NextResponse.json({ success: true, settings })
}

export async function PUT(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  if (!isSuperAdmin(session.role)) {
    return NextResponse.json(
      { success: false, error: "Super admin access required to change site settings." },
      { status: 403 }
    )
  }

  const body = await req.json()
  const parsed = siteSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  })

  revalidateTag("site-settings")

  return NextResponse.json({ success: true, settings })
}
