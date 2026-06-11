import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { homepageCMSSchema } from "@/lib/validations/homepage"

export async function GET() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const cms = await prisma.homepageCMS.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  })
  return NextResponse.json({ success: true, cms })
}

export async function PUT(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const body = await req.json()
  const parsed = homepageCMSSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const cms = await prisma.homepageCMS.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  })

  revalidateTag("homepage-cms")

  return NextResponse.json({ success: true, cms })
}
