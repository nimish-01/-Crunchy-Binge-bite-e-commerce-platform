import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const CART_COOKIE = "cart_sid"

const patchSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99, "Quantity cannot exceed 99"),
})

type Params = { params: Promise<{ id: string }> }

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

// PATCH /api/cart/[id] — update quantity of a specific cart item
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const guestSid = cookieStore.get(CART_COOKIE)?.value
    const userId = session?.user?.id ?? null

    if (!userId && !guestSid) {
      return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { quantity } = parsed.data
    const { id: itemId } = await params

    // Verify the cart item belongs to this session/user
    const cartItem = await prisma.cartItem.findFirst({
      where: userId
        ? { id: itemId, cart: { userId } }
        : { id: itemId, cart: { sessionId: guestSid! } },
      select: {
        id: true,
        variant: { select: { stock: true, isActive: true } },
      },
    })

    if (!cartItem) {
      return NextResponse.json({ success: false, error: "Cart item not found" }, { status: 404 })
    }
    if (!cartItem.variant.isActive) {
      return NextResponse.json({ success: false, error: "This product is no longer available" }, { status: 400 })
    }
    if (cartItem.variant.stock < quantity) {
      return NextResponse.json(
        { success: false, error: `Only ${cartItem.variant.stock} items available in stock` },
        { status: 400 }
      )
    }

    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } })
    const cart = userId ? await findCart({ userId }) : await findCart({ sessionId: guestSid! })

    return NextResponse.json({ success: true, data: cart, message: "Cart updated" })
  } catch (error) {
    console.error("[PATCH /api/cart/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/cart/[id] — remove a specific cart item by its id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const guestSid = cookieStore.get(CART_COOKIE)?.value
    const userId = session?.user?.id ?? null

    if (!userId && !guestSid) {
      return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404 })
    }

    const { id: itemId } = await params

    // Verify ownership before deleting
    const cartItem = await prisma.cartItem.findFirst({
      where: userId
        ? { id: itemId, cart: { userId } }
        : { id: itemId, cart: { sessionId: guestSid! } },
      select: { id: true },
    })

    if (!cartItem) {
      return NextResponse.json({ success: false, error: "Cart item not found" }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id: itemId } })
    const cart = userId ? await findCart({ userId }) : await findCart({ sessionId: guestSid! })

    return NextResponse.json({ success: true, data: cart, message: "Item removed from cart" })
  } catch (error) {
    console.error("[DELETE /api/cart/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
