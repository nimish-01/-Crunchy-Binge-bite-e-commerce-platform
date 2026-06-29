import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const CART_COOKIE = "cart_sid"
const COOKIE_OPTS = {
  httpOnly: true,
  secure: (process.env.NEXTAUTH_URL ?? "").startsWith("https://"),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0, // expire immediately
}

async function findCartWithItems(where: { userId: string } | { sessionId: string }) {
  return prisma.cart.findUnique({
    where,
    select: {
      id: true,
      sessionId: true,
      items: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          quantity: true,
          variantId: true,
          productId: true,
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: {
            select: { id: true, weight: true, price: true, mrp: true, stock: true, sku: true },
          },
        },
      },
    },
  })
}

type CartData = NonNullable<Awaited<ReturnType<typeof findCartWithItems>>>

function buildCartResponse(cart: CartData) {
  const subtotal =
    Math.round(cart.items.reduce((s, i) => s + i.variant.price * i.quantity, 0) * 100) / 100
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)
  return { id: cart.id, sessionId: cart.sessionId, items: cart.items, subtotal, itemCount }
}

/**
 * POST /api/cart/merge
 * Merges the guest (cookie-based) cart into the authenticated user's cart.
 * Safe to call multiple times — no-op if no guest cart exists.
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    const cookieStore = await cookies()
    const guestSid = cookieStore.get(CART_COOKIE)?.value

    if (!guestSid) {
      // No guest cart — just return the user's current cart
      const userCart = await findCartWithItems({ userId })
      return NextResponse.json({
        success: true,
        data: userCart ? buildCartResponse(userCart) : { id: null, items: [], subtotal: 0, itemCount: 0 },
        message: "No guest cart to merge",
      })
    }

    const guestCart = await findCartWithItems({ sessionId: guestSid })

    if (!guestCart || guestCart.items.length === 0) {
      // Empty guest cart — clean up cookie
      const res = NextResponse.json({
        success: true,
        data: { id: null, items: [], subtotal: 0, itemCount: 0 },
        message: "No guest items to merge",
      })
      res.cookies.set(CART_COOKIE, "", COOKIE_OPTS)
      return res
    }

    // Get or create the user cart
    const userCart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    })
    const userCartId = userCart.id

    // Merge guest items into user cart — additive, capped at stock
    for (const guestItem of guestCart.items) {
      // Check stock
      const variant = await prisma.productVariant.findUnique({
        where: { id: guestItem.variantId },
        select: { stock: true, isActive: true },
      })
      if (!variant?.isActive) continue

      const existing = await prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: userCartId, variantId: guestItem.variantId } },
        select: { quantity: true },
      })

      const mergedQty = Math.min(
        99,
        Math.min(variant.stock, (existing?.quantity ?? 0) + guestItem.quantity)
      )

      await prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCartId, variantId: guestItem.variantId } },
        create: {
          cartId: userCartId,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          quantity: mergedQty,
        },
        update: { quantity: mergedQty },
      })
    }

    // Delete guest cart
    await prisma.cart.delete({ where: { id: guestCart.id } })

    const merged = await findCartWithItems({ userId })
    const res = NextResponse.json({
      success: true,
      data: merged ? buildCartResponse(merged) : { id: userCartId, items: [], subtotal: 0, itemCount: 0 },
      message: `Merged ${guestCart.items.length} item(s) from guest cart`,
    })

    // Expire the guest cookie
    res.cookies.set(CART_COOKIE, "", COOKIE_OPTS)
    return res
  } catch (error) {
    console.error("[POST /api/cart/merge]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
