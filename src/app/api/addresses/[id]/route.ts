import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { addressSchema } from "@/lib/validations/order"

const patchSchema = addressSchema.extend({ isDefault: z.boolean() }).partial()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id
    const { id } = await params

    const existing = await prisma.address.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }
    const { isDefault, ...rest } = parsed.data

    const address = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
      }
      return tx.address.update({
        where: { id },
        data: { ...rest, ...(isDefault !== undefined ? { isDefault } : {}) },
      })
    }, { timeout: 15000, maxWait: 5000 })

    return NextResponse.json({ success: true, data: { address }, message: "Address updated" })
  } catch (error) {
    console.error("[PATCH /api/addresses/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id
    const { id } = await params

    const existing = await prisma.address.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 })
    }

    const activeOrderCount = await prisma.order.count({
      where: { addressId: id, status: { notIn: ["CANCELLED", "REFUNDED", "DELIVERED"] } },
    })
    if (activeOrderCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete address linked to active orders" },
        { status: 409 }
      )
    }

    await prisma.address.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Address deleted" })
  } catch (error) {
    console.error("[DELETE /api/addresses/[id]]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
