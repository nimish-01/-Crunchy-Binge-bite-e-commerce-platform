import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const CART_COOKIE = "cart_sid"
const COOKIE_OPTS = {
  httpOnly: true,
  secure: (process.env.NEXTAUTH_URL ?? "").startsWith("https://"),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

const addItemSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  variantId: z.string().min(1, "variantId is required"),
  quantity: z.number().int().min(0, "quantity must be >= 0").max(99, "quantity must be <= 99"),
})

async function findCart(where: { userId: string } | { sessionId: string }) {
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

type CartData = NonNullable<Awaited<ReturnType<typeof findCart>>>

function buildCartResponse(cart: CartData) {
  const subtotal =
    Math.round(cart.items.reduce((s, i) => s + i.variant.price * i.quantity, 0) * 100) / 100
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)
  return { id: cart.id, sessionId: cart.sessionId, items: cart.items, subtotal, itemCount }
}

// GET /api/cart — works for both authenticated users and guests
export async function GET() {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const guestSid = cookieStore.get(CART_COOKIE)?.value

    let cart: CartData | null = null
    if (session?.user?.id) {
      cart = await findCart({ userId: session.user.id })
    } else if (guestSid) {
      cart = await findCart({ sessionId: guestSid })
    }

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: { id: null, items: [], subtotal: 0, itemCount: 0 },
      })
    }

    return NextResponse.json({ success: true, data: buildCartResponse(cart) })
  } catch (error) {
    console.error("[GET /api/cart]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/cart — add or update item (quantity 0 = remove)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const guestSid = cookieStore.get(CART_COOKIE)?.value

    const body = await req.json()
    const parsed = addItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }
    const { productId, variantId, quantity } = parsed.data

    // Validate variant availability
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        isActive: true,
        product: { id: productId, status: "ACTIVE" },
      },
      select: { id: true, stock: true, productId: true },
    })
    if (!variant) {
      return NextResponse.json({ success: false, error: "Product not available" }, { status: 404 })
    }
    if (quantity > 0 && variant.stock < quantity) {
      return NextResponse.json(
        { success: false, error: `Only ${variant.stock} items available in stock` },
        { status: 400 }
      )
    }

    const userId = session?.user?.id ?? null
    let cartId: string
    let newGuestSid: string | null = null

    if (userId) {
      const cart = await prisma.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { id: true },
      })
      cartId = cart.id
    } else {
      const sid = guestSid ?? crypto.randomUUID()
      if (!guestSid) newGuestSid = sid
      const cart = await prisma.cart.upsert({
        where: { sessionId: sid },
        create: { sessionId: sid },
        update: {},
        select: { id: true },
      })
      cartId = cart.id
    }

    if (quantity === 0) {
      await prisma.cartItem.deleteMany({ where: { cartId, variantId } })
    } else {
      await prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId, variantId } },
        create: { cartId, productId, variantId, quantity },
        update: { quantity },
      })
    }

    const updatedSid = userId ? null : guestSid ?? newGuestSid!
    const updatedCart = userId
      ? await findCart({ userId })
      : await findCart({ sessionId: updatedSid! })

    const res = NextResponse.json({
      success: true,
      data: updatedCart
        ? buildCartResponse(updatedCart)
        : { id: cartId, items: [], subtotal: 0, itemCount: 0 },
      message: quantity === 0 ? "Item removed from cart" : "Cart updated",
    })

    if (newGuestSid) {
      res.cookies.set(CART_COOKIE, newGuestSid, COOKIE_OPTS)
    }

    return res
  } catch (error) {
    console.error("[POST /api/cart]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/cart?variantId=xxx  — remove one item
// DELETE /api/cart                 — clear entire cart
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const guestSid = cookieStore.get(CART_COOKIE)?.value

    const userId = session?.user?.id ?? null

    if (!userId && !guestSid) {
      return NextResponse.json({
        success: true,
        data: { id: null, items: [], subtotal: 0, itemCount: 0 },
        message: "Cart cleared",
      })
    }

    const cart = userId
      ? await findCart({ userId })
      : await findCart({ sessionId: guestSid! })

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: { id: null, items: [], subtotal: 0, itemCount: 0 },
        message: "Cart cleared",
      })
    }

    const variantId = req.nextUrl.searchParams.get("variantId")

    if (variantId) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } })
    } else {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
    }

    const updatedCart = userId
      ? await findCart({ userId })
      : await findCart({ sessionId: guestSid! })

    return NextResponse.json({
      success: true,
      data: updatedCart
        ? buildCartResponse(updatedCart)
        : { id: cart.id, items: [], subtotal: 0, itemCount: 0 },
      message: variantId ? "Item removed from cart" : "Cart cleared",
    })
  } catch (error) {
    console.error("[DELETE /api/cart]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
