import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const validateSchema = z.object({
  addressId: z.string().min(1, "Address is required"),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const parsed = validateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }
    const { addressId } = parsed.data

    // Verify address belongs to user
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
    if (!address) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 })
    }

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            quantity: true,
            productId: true,
            variantId: true,
            product: { select: { id: true, name: true, slug: true, images: true, status: true } },
            variant: { select: { id: true, weight: true, price: true, mrp: true, stock: true, isActive: true } },
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: "Your cart is empty" }, { status: 400 })
    }

    // Validate each item and collect errors
    const errors: string[] = []
    let subtotal = 0

    const validatedItems = cart.items.map((item) => {
      const { product, variant } = item

      if (product.status !== "ACTIVE") {
        errors.push(`"${product.name}" is no longer available`)
      } else if (!variant.isActive) {
        errors.push(`"${product.name}" — selected size is unavailable`)
      } else if (variant.stock < item.quantity) {
        errors.push(
          `"${product.name}" — only ${variant.stock} in stock (you have ${item.quantity} in cart)`
        )
      }

      const lineTotal = variant.price * item.quantity
      subtotal += lineTotal

      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: variant.price,
        lineTotal,
        available: variant.stock,
        product: { name: product.name, slug: product.slug, images: product.images },
        variant: { id: variant.id, weight: variant.weight, price: variant.price, mrp: variant.mrp },
      }
    })

    // Find delivery zone by pincode
    const zone = await prisma.deliveryZone.findFirst({
      where: { pincodes: { has: address.pincode }, isActive: true },
      select: { name: true, deliveryCharge: true, freeDeliveryThreshold: true, estimatedDaysMin: true, estimatedDaysMax: true, codEnabled: true },
    })

    const isFreeDelivery = zone ? subtotal >= zone.freeDeliveryThreshold : false
    const deliveryCharge = zone ? (isFreeDelivery ? 0 : zone.deliveryCharge) : 0
    const total = subtotal + deliveryCharge

    return NextResponse.json({
      success: true,
      data: {
        valid: errors.length === 0,
        items: validatedItems,
        address,
        pricing: { subtotal, deliveryCharge, total, isFreeDelivery },
        deliveryZone: zone
          ? { name: zone.name, estimatedDaysMin: zone.estimatedDaysMin, estimatedDaysMax: zone.estimatedDaysMax, codEnabled: zone.codEnabled }
          : null,
        errors,
      },
    })
  } catch (error) {
    console.error("[POST /api/checkout/validate]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
