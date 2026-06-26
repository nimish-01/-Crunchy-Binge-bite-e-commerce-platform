import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const original = await prisma.promotion.findUnique({
    where: { id },
    include: {
      categories: true,
      products:   true,
    },
  })

  if (!original) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const { id: _id, createdAt: _c, updatedAt: _u, impressions: _i, clicks: _cl, config, categories, products, ...data } = original

  const copy = await prisma.promotion.create({
    data: {
      ...data,
      name: `${data.name} (Copy)`,
      isActive: false,
      impressions: 0,
      clicks: 0,
      config: (config ?? {}) as never,
      categories: categories.length
        ? { create: categories.map((c) => ({ categoryId: c.categoryId })) }
        : undefined,
      products: products.length
        ? { create: products.map((p) => ({ productId: p.productId })) }
        : undefined,
    },
  })

  revalidateTag("promotions")
  return NextResponse.json({ success: true, promotion: copy }, { status: 201 })
}
