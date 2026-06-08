import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { categorySchema } from "@/lib/validations/product"
import { slugify } from "@/lib/utils"

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: { categories } })
  } catch (error) {
    console.error("[GET /api/admin/categories]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const body = await req.json()
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const finalSlug = parsed.data.slug || slugify(parsed.data.name)
    const existing = await prisma.category.findUnique({ where: { slug: finalSlug } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A category with this slug already exists" }, { status: 409 })
    }

    const category = await prisma.category.create({ data: { ...parsed.data, slug: finalSlug } })

    return NextResponse.json(
      { success: true, data: { category }, message: "Category created" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/admin/categories]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
