import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const product = await prisma.product.findUnique({
      where: { slug, status: "ACTIVE" },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
        reviews: {
          where: { status: "APPROVED" },
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: { reviews: { where: { status: "APPROVED" } } },
        },
      },
    })

    if (!product || product.variants.length === 0) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const avgRating =
      product.reviews.length > 0
        ? Math.round(
            (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10
          ) / 10
        : 0

    return NextResponse.json({
      success: true,
      data: { ...product, avgRating },
    })
  } catch (error) {
    console.error("[GET /api/products/[slug]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
