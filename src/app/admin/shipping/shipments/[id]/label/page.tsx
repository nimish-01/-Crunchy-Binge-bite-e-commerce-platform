import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

interface Props { params: Promise<{ id: string }> }

export default async function ShippingLabelPage({ params }: Props) {
  const { id } = await params

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      courier: { select: { name: true } },
      order: {
        include: {
          address: true,
          user: { select: { name: true, phone: true } },
        },
      },
    },
  })

  if (!shipment) notFound()

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } })
  const addr = shipment.order.address

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { size: 100mm 150mm; margin: 6mm; }
        }
        body { font-family: -apple-system, system-ui, sans-serif; color: #111; background: white; }
      `}</style>

      <div className="no-print fixed top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Print Label
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-zinc-100 text-zinc-700 text-sm rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Label — 100mm × 150mm */}
      <div style={{
        width: 378, /* 100mm at 96dpi */
        minHeight: 567, /* 150mm */
        border: "2px solid #111",
        margin: "20px auto",
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, system-ui, sans-serif",
      }}>
        {/* Header bar */}
        <div style={{ background: "#111", color: "#fff", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🌾 {settings?.companyName ?? "Binge Bite"}</span>
          {shipment.courier && <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4 }}>{shipment.courier.name}</span>}
        </div>

        {/* Shipment number */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Shipment No.</p>
            <p style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", margin: "2px 0 0" }}>{shipment.shipmentNumber}</p>
          </div>
          {shipment.trackingNumber && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Tracking</p>
              <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", margin: "2px 0 0" }}>{shipment.trackingNumber}</p>
            </div>
          )}
        </div>

        {/* Barcode representation */}
        <div style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #ddd" }}>
          <div style={{ fontFamily: "monospace", fontSize: 28, letterSpacing: "0.08em", fontWeight: 900, lineHeight: 1 }}>
            {'|█|█|'.repeat(3)}{shipment.shipmentNumber.replace(/-/g, '').substring(0, 8).split('').join('|')}{'|█|█|'.repeat(2)}
          </div>
          <p style={{ fontSize: 9, color: "#888", margin: "4px 0 0", fontFamily: "monospace" }}>{shipment.shipmentNumber}</p>
        </div>

        {/* To address — large */}
        <div style={{ padding: "12px", borderBottom: "1px solid #ddd", flex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 6px" }}>DELIVER TO</p>
          {addr ? (
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{addr.name}</p>
              <p style={{ margin: 0, color: "#555", fontWeight: 600 }}>{addr.phone}</p>
              <p style={{ margin: "4px 0 0" }}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
              <p style={{ margin: 0 }}>{addr.city}, {addr.state}</p>
              <p style={{ fontWeight: 800, fontSize: 16, margin: "4px 0 0" }}>PIN {addr.pincode}</p>
            </div>
          ) : <p style={{ color: "#888" }}>Address not found</p>}
        </div>

        {/* From address */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #ddd", background: "#f9f9f9" }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 4px" }}>RETURN TO</p>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: "#555" }}>
            <p style={{ margin: 0, fontWeight: 600, color: "#111" }}>{settings?.companyName ?? "Binge Bite"}</p>
            {settings?.businessAddress ? (
              <p style={{ margin: 0 }}>{settings.businessAddress.replace(/\n/g, ", ")}</p>
            ) : null}
            {settings?.supportPhone && <p style={{ margin: 0 }}>{settings.supportPhone}</p>}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", background: "#f2f2f2", fontSize: 10 }}>
          <span>Order #{shipment.order.orderNumber ?? ""}</span>
          {shipment.weightGrams && <span>Wt: {shipment.weightGrams}g</span>}
          <span>FRAGILE — HANDLE WITH CARE</span>
        </div>
      </div>
    </>
  )
}
