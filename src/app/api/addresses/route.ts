import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { addressSchema } from "@/lib/validations/order"

const createAddressSchema = addressSchema.extend({
  isDefault: z.boolean().default(false),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ success: true, data: { addresses } })
  } catch (error) {
    console.error("[GET /api/addresses]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const parsed = createAddressSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }
    const { isDefault, ...rest } = parsed.data

    const address = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.address.count({ where: { userId } })
      const makeDefault = isDefault || existingCount === 0

      if (makeDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
      }

      return tx.address.create({
        data: { ...rest, userId, isDefault: makeDefault },
      })
    }, { timeout: 15000, maxWait: 5000 })

    return NextResponse.json(
      { success: true, data: { address }, message: "Address saved" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/addresses]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
