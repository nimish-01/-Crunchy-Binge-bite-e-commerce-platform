import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatPrice, formatDate } from "@/lib/utils"

interface Props { params: Promise<{ id: string }> }

export default async function PackingSlipPage({ params }: Props) {
  const { id } = await params

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
          address: true,
          items: {
            include: {
              product: { select: { name: true } },
              variant: { select: { weight: true, sku: true } },
            },
          },
        },
      },
    },
  })

  if (!shipment) notFound()

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } })
  const o = shipment.order

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 12mm; }
        }
        body { font-family: -apple-system, system-ui, sans-serif; color: #111; background: white; }
      `}</style>

      <div className="no-print fixed top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Print
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-zinc-100 text-zinc-700 text-sm rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Close
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #111" }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🌾 {settings?.companyName ?? "Crunchy Bingebite"}</p>
            <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>PACKING SLIP</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Order #{o.orderNumber}</p>
            <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{formatDate(o.createdAt)}</p>
            <p style={{ fontSize: 11, color: "#666" }}>Shipment: {shipment.shipmentNumber}</p>
          </div>
        </div>

        {/* Addresses */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", marginBottom: 6 }}>Ship To</p>
            {o.address ? (
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <p style={{ fontWeight: 600, margin: 0 }}>{o.address.name}</p>
                <p style={{ margin: 0 }}>{o.address.phone}</p>
                <p style={{ margin: 0 }}>{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}</p>
                <p style={{ margin: 0 }}>{o.address.city}, {o.address.state}</p>
                <p style={{ margin: 0 }}>PIN {o.address.pincode}</p>
              </div>
            ) : <p style={{ fontSize: 13, color: "#888" }}>Address unavailable</p>}
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", marginBottom: 6 }}>Return To</p>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "#555" }}>
              <p style={{ margin: 0, fontWeight: 600, color: "#111" }}>{settings?.companyName ?? "Crunchy Bingebite"}</p>
              {settings?.businessAddress && <p style={{ margin: 0, whiteSpace: "pre-line" }}>{settings.businessAddress}</p>}
              {settings?.supportPhone && <p style={{ margin: 0 }}>{settings.supportPhone}</p>}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>Product</th>
              <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>SKU</th>
              <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "8px 4px", fontSize: 10, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 4px", fontSize: 12, color: "#888" }}>{i + 1}</td>
                <td style={{ padding: "10px 4px", fontSize: 12 }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>{item.product.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#888" }}>{item.variant.weight}</p>
                </td>
                <td style={{ padding: "10px 4px", fontSize: 11, color: "#666", fontFamily: "monospace" }}>{item.variant.sku}</td>
                <td style={{ padding: "10px 4px", fontSize: 12, textAlign: "center", fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ padding: "10px 4px", fontSize: 12, textAlign: "right" }}>{formatPrice(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <div style={{ width: 200 }}>
            {o.discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", marginBottom: 4 }}>
                <span>Discount</span><span>−{formatPrice(o.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", marginBottom: 4 }}>
              <span>Delivery</span><span>{o.deliveryCharge > 0 ? formatPrice(o.deliveryCharge) : "FREE"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, borderTop: "1px solid #ddd", paddingTop: 8, marginTop: 4 }}>
              <span>Total</span><span>{formatPrice(o.total)}</span>
            </div>
          </div>
        </div>

        {/* Barcode representation */}
        <div style={{ textAlign: "center", padding: "16px 0", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", marginBottom: 16 }}>
          <p style={{ fontFamily: "monospace", fontSize: 24, letterSpacing: "0.15em", fontWeight: 700, margin: 0 }}>
            {'|'.repeat(2)}{shipment.shipmentNumber.replace(/-/g, '').split('').join('|').substring(0, 40)}{'|'.repeat(2)}
          </p>
          <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{shipment.shipmentNumber}</p>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#999", margin: 0 }}>
          Thank you for shopping with {settings?.companyName ?? "Crunchy Bingebite"}!
        </p>
      </div>
    </>
  )
}
