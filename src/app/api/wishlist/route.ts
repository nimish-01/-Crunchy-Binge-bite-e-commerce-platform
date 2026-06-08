import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const addWishlistSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  variantId: z.string().optional(),
})

async function requireAuth(req?: NextRequest) {
  void req
  const session = await auth()
  if (!session?.user?.id) {
    return {
      userId: null as null,
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      ),
    }
  }
  return { userId: session.user.id, response: null }
}

// GET /api/wishlist — returns authenticated user's wishlist
export async function GET() {
  try {
    const { userId, response } = await requireAuth()
    if (response) return response

    const wishlist = await prisma.wishlist.findMany({
      where: { userId: userId! },
      select: {
        id: true,
        productId: true,
        variantId: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            shortDescription: true,
            status: true,
            dietaryTags: true,
            isFeatured: true,
            category: { select: { id: true, name: true, slug: true } },
            variants: {
              where: { isActive: true },
              select: { id: true, weight: true, price: true, mrp: true, stock: true },
              orderBy: { price: "asc" as const },
              take: 1,
            },
            _count: { select: { reviews: { where: { status: "APPROVED" } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: { wishlist } })
  } catch (error) {
    console.error("[GET /api/wishlist]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/wishlist — add product to wishlist
export async function POST(req: NextRequest) {
  try {
    const { userId, response } = await requireAuth()
    if (response) return response

    const body = await req.json()
    const parsed = addWishlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }
    const { productId, variantId } = parsed.data

    const product = await prisma.product.findUnique({
      where: { id: productId, status: "ACTIVE" },
      select: { id: true },
    })
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const item = await prisma.wishlist.upsert({
      where: { userId_productId: { userId: userId!, productId } },
      create: { userId: userId!, productId, variantId: variantId ?? null },
      update: { variantId: variantId ?? null },
    })

    return NextResponse.json(
      { success: true, data: { item }, message: "Added to wishlist" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/wishlist]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/wishlist?productId=xxx — remove product from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const { userId, response } = await requireAuth()
    if (response) return response

    const productId = req.nextUrl.searchParams.get("productId")
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId query parameter is required" },
        { status: 400 }
      )
    }

    await prisma.wishlist.deleteMany({ where: { userId: userId!, productId } })

    return NextResponse.json({ success: true, message: "Removed from wishlist" })
  } catch (error) {
    console.error("[DELETE /api/wishlist]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
