import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { parsePeriod } from "@/lib/services/analytics"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isAdminSession(session)) return session

  const { searchParams } = new URL(req.url)
  const type   = searchParams.get("type") ?? "sales"
  const format = searchParams.get("format") ?? "csv"
  const range  = parsePeriod(searchParams)

  let rows: Record<string, unknown>[] = []

  if (type === "sales") {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      include: {
        user:    { select: { name: true, email: true } },
        address: { select: { city: true, state: true, pincode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    })
    rows = orders.map((o) => ({
      "Order Number":    o.orderNumber,
      "Date":            o.createdAt.toISOString().slice(0, 10),
      "Customer":        o.user?.name  ?? "Guest",
      "Email":           o.user?.email ?? "—",
      "Status":          o.status,
      "Payment Method":  o.paymentMethod,
      "Payment Status":  o.paymentStatus,
      "Subtotal":        o.subtotal.toFixed(2),
      "Discount":        o.discountAmount.toFixed(2),
      "Delivery":        o.deliveryCharge.toFixed(2),
      "Coupon":          o.couponId ?? "—",
      "City":            o.address?.city    ?? "—",
      "State":           o.address?.state   ?? "—",
    }))
  } else if (type === "customers") {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER", createdAt: { gte: range.start, lte: range.end } },
      select: {
        name: true, email: true, phone: true,
        loyaltyPoints: true, loyaltyTier: true, createdAt: true, isActive: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    })
    rows = customers.map((c) => ({
      "Name":            c.name    ?? "—",
      "Email":           c.email   ?? "—",
      "Phone":           c.phone   ?? "—",
      "Loyalty Points":  c.loyaltyPoints,
      "Tier":            c.loyaltyTier,
      "Orders":          c._count.orders,
      "Status":          c.isActive ? "Active" : "Suspended",
      "Joined":          c.createdAt.toISOString().slice(0, 10),
    }))
  } else if (type === "inventory") {
    const variants = await prisma.productVariant.findMany({
      include: { product: { select: { name: true, category: { select: { name: true } } } } },
      orderBy: { stock: "asc" },
      take: 5000,
    })
    rows = variants.map((v) => ({
      "Product":  v.product.name,
      "Category": v.product.category.name,
      "Weight":   v.weight,
      "SKU":      v.sku,
      "Price":    v.price.toFixed(2),
      "Stock":    v.stock,
      "Status":   v.isActive ? "Active" : "Inactive",
    }))
  }

  if (format === "csv") {
    if (rows.length === 0) return NextResponse.json({ success: false, error: "No data" }, { status: 404 })
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type":        "text/csv",
        "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  // JSON fallback (client uses xlsx to convert)
  return NextResponse.json({ success: true, rows, type, range: { start: range.start, end: range.end } })
}
