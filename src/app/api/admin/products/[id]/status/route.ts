import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin()
    if (!isAdminSession(admin)) return admin

    const { id } = await params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, name: true, slug: true, status: true },
    })

    return NextResponse.json({
      success: true,
      data: { product: updated },
      message: `Product ${parsed.data.status === "ACTIVE" ? "published" : parsed.data.status === "ARCHIVED" ? "archived" : "set to draft"}`,
    })
  } catch (error) {
    console.error("[PATCH /api/admin/products/[id]/status]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
