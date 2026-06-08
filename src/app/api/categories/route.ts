import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        sortOrder: true,
        seoTitle: true,
        seoDesc: true,
        _count: {
          select: { products: { where: { status: "ACTIVE" } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: { categories } })
  } catch (error) {
    console.error("[GET /api/categories]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
