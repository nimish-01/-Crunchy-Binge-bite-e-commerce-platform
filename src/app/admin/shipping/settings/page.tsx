import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Settings2 } from "lucide-react"

const SETTINGS_LINKS = [
  { label: "Delivery Zones",   href: "/admin/shipping/zones",    desc: "Manage serviceable areas, PIN codes, and delivery charges" },
  { label: "Couriers",         href: "/admin/shipping/couriers", desc: "Add and configure courier partners" },
  { label: "Shipping Rates",   href: "/admin/shipping/rates",    desc: "Set flat, weight-based, and order value pricing rules" },
]

export default function ShippingSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Shipping Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your shipping infrastructure</p>
      </div>

      <div className="space-y-3">
        {SETTINGS_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-5 hover:border-border hover:shadow-elevation-1 transition-all duration-200 group"
          >
            <div>
              <p className="font-medium group-hover:text-brand-400 transition-colors">{link.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{link.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Courier API Integration</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The shipping service layer is architected for seamless courier API integration.
          When you are ready to integrate Shiprocket, Delhivery, or any other provider,
          replace the manual provider implementation in <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/lib/shipping/service.ts</code> with the courier API client.
          All shipment creation, tracking updates, and status syncing will happen automatically without changing the rest of the application.
        </p>
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">INTEGRATION READY FOR:</p>
          <div className="flex flex-wrap gap-2">
            {["Shiprocket", "Delhivery", "Blue Dart", "DTDC", "Shadowfax", "XpressBees", "Ekart"].map((name) => (
              <span key={name} className="px-2 py-0.5 rounded-md border border-border/50 text-xs text-muted-foreground">{name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
