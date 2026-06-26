import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name:               z.string().min(1).optional(),
  website:            z.string().optional(),
  trackingUrlPattern: z.string().optional(),
  supportPhone:       z.string().optional(),
  supportEmail:       z.string().optional(),
  logo:               z.string().optional(),
  isActive:           z.boolean().optional(),
  priority:           z.number().int().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const courier = await prisma.courier.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ success: true, data: { courier } })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { id } = await params

  const count = await prisma.shipment.count({ where: { courierId: id } })
  if (count > 0) {
    return NextResponse.json(
      { success: false, error: `Cannot delete: ${count} shipments use this courier. Deactivate instead.` },
      { status: 409 }
    )
  }

  await prisma.courier.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
