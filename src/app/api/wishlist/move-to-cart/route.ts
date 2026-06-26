import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthenticatedSession } from "@/lib/api-auth"

export async function POST(req: Request) {
  const session = await requireAuth()
  if (!isAuthenticatedSession(session)) return session

  const { wishlistId } = await req.json()
  if (!wishlistId) {
    return NextResponse.json({ success: false, error: "wishlistId required" }, { status: 400 })
  }

  const item = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
  })

  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }
  if (!item.variantId) {
    return NextResponse.json({ success: false, error: "No variant selected" }, { status: 400 })
  }

  // Check variant stock
  const variant = await prisma.productVariant.findUnique({
    where: { id: item.variantId },
    select: { stock: true, isActive: true },
  })
  if (!variant?.isActive || variant.stock === 0) {
    return NextResponse.json({ success: false, error: "Item out of stock" }, { status: 400 })
  }

  let cart = await prisma.cart.findUnique({ where: { userId: session.user.id } })
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: session.user.id } })
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
    create: {
      cartId:    cart.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity:  1,
    },
    update: { quantity: { increment: 1 } },
  })

  return NextResponse.json({ success: true, message: "Added to cart" })
}
