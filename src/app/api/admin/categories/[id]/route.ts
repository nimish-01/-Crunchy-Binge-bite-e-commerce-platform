import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { categorySchema } from "@/lib/validations/product"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = categorySchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Check slug uniqueness if changing
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const conflict = await prisma.category.findUnique({ where: { slug: parsed.data.slug } })
      if (conflict) {
        return NextResponse.json({ success: false, error: "A category with this slug already exists" }, { status: 409 })
      }
    }

    const category = await prisma.category.update({ where: { id }, data: parsed.data })

    return NextResponse.json({ success: true, data: { category }, message: "Category updated" })
  } catch (error) {
    console.error("[PATCH /api/admin/categories/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 })
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete category with ${existing._count.products} product(s). Move or delete them first.` },
        { status: 409 }
      )
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Category deleted" })
  } catch (error) {
    console.error("[DELETE /api/admin/categories/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
