import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatPrice, formatDateTime } from "@/lib/utils"

interface Props { params: Promise<{ id: string }> }

export default async function InvoicePage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true } },
          variant: { select: { weight: true, sku: true } },
        },
      },
      coupon: { select: { code: true } },
    },
  })

  if (!order) notFound()

  const subtotal    = Number(order.subtotal)
  const discount    = Number(order.discountAmount)
  const delivery    = Number(order.deliveryCharge)
  const total       = Number(order.total)
  const gst         = order.gstRequired ? Math.round(total * 0.18 * 100) / 100 : 0

  return (
    <div className="min-h-screen bg-white text-black print:m-0">
      <div className="max-w-2xl mx-auto p-8">

        {/* Print button — hidden in print */}
        <div className="flex justify-end mb-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800"
          >
            Print / Save PDF
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Crunchy Bingebite</h1>
            <p className="text-sm text-gray-500 mt-0.5">Premium Makhana</p>
            <p className="text-xs text-gray-400 mt-1">
              support@bingebite.in · www.bingebite.in
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">INVOICE</p>
            <p className="text-sm font-mono font-semibold mt-1">#{order.orderNumber}</p>
            <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Billing address */}
        {order.address && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
            <p className="font-semibold">{order.address.name}</p>
            <p className="text-sm text-gray-600">{order.address.phone}</p>
            <p className="text-sm text-gray-600">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
            </p>
            <p className="text-sm text-gray-600">
              {order.address.city}, {order.address.state} – {order.address.pincode}
            </p>
          </div>
        )}

        {/* Items table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-2 font-semibold text-gray-700">Item</th>
              <th className="pb-2 font-semibold text-gray-700 text-center">Qty</th>
              <th className="pb-2 font-semibold text-gray-700 text-right">Unit Price</th>
              <th className="pb-2 font-semibold text-gray-700 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2.5">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.variant.weight}
                    {item.variant.sku ? ` · SKU: ${item.variant.sku}` : ""}
                  </p>
                </td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="py-2.5 text-right">{formatPrice(item.unitPrice)}</td>
                <td className="py-2.5 text-right font-medium">{formatPrice(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-60 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span>{delivery > 0 ? formatPrice(delivery) : "FREE"}</span>
            </div>
            {gst > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>GST (18%)</span>
                <span>{formatPrice(gst)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment details */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
          <div>
            <span className="font-medium text-gray-600">Payment: </span>
            <span className="capitalize">{order.paymentMethod?.toLowerCase() ?? "—"}</span>
            {" · "}
            <span
              className={order.paymentStatus === "PAID" ? "text-green-600 font-medium" : "text-yellow-600"}
            >
              {order.paymentStatus}
            </span>
            {order.transactionId && (
              <span className="ml-2 font-mono">ID: {order.transactionId}</span>
            )}
          </div>
          <p className="text-gray-300">Thank you for your order!</p>
        </div>
      </div>
    </div>
  )
}
