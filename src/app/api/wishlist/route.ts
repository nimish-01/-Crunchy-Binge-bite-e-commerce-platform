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
// Supports ?productId=xxx to check if a specific product is wishlisted
export async function GET(req: NextRequest) {
  try {
    const { userId, response } = await requireAuth()
    if (response) return response

    const productId = req.nextUrl.searchParams.get("productId")
    const where = productId
      ? { userId: userId!, productId }
      : { userId: userId! }

    const wishlist = await prisma.wishlist.findMany({
      where,
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

    // Support both response shapes for backward compat
    return NextResponse.json({ success: true, items: wishlist, data: { wishlist } })
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
      { success: true, item, data: { item }, message: "Added to wishlist" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/wishlist]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/wishlist?productId=xxx OR ?id=xxx — remove from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const { userId, response } = await requireAuth()
    if (response) return response

    const id        = req.nextUrl.searchParams.get("id")
    const productId = req.nextUrl.searchParams.get("productId")

    if (id) {
      // Delete by wishlist item ID (ownership check via userId)
      await prisma.wishlist.deleteMany({ where: { id, userId: userId! } })
    } else if (productId) {
      await prisma.wishlist.deleteMany({ where: { userId: userId!, productId } })
    } else {
      return NextResponse.json(
        { success: false, error: "id or productId query parameter is required" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, message: "Removed from wishlist" })
  } catch (error) {
    console.error("[DELETE /api/wishlist]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
