import { requireAdmin, isAdminSession } from "@/lib/api-auth"
import { redirect } from "next/navigation"
import AnalyticsNav from "@/components/admin/analytics/analytics-nav"
import ExportButton from "@/components/admin/analytics/export-button"
import { FileText, FileSpreadsheet, Printer, Download } from "lucide-react"

export const metadata = { title: "Reports & Export — Admin" }

const REPORTS = [
  {
    type:        "sales",
    title:       "Sales Report",
    description: "Orders, revenue, discounts, shipping, refunds",
    icon:        FileText,
    color:       "text-green-500",
  },
  {
    type:        "customers",
    title:       "Customer Report",
    description: "All customers with spend, orders, and loyalty tier",
    icon:        FileSpreadsheet,
    color:       "text-blue-500",
  },
  {
    type:        "inventory",
    title:       "Inventory Report",
    description: "All active variants with stock levels and prices",
    icon:        FileText,
    color:       "text-orange-500",
  },
] as const

const PERIODS = [
  { value: "today",     label: "Today"     },
  { value: "7d",        label: "Last 7 Days" },
  { value: "30d",       label: "Last 30 Days" },
  { value: "90d",       label: "Last 90 Days" },
  { value: "year",      label: "This Year"  },
]

export default async function ReportsPage() {
  const session = await requireAdmin()
  if (!isAdminSession(session)) redirect("/admin/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Export</h1>
        <p className="text-sm text-muted-foreground">Download data as CSV or Excel. Print to PDF via browser.</p>
      </div>

      <AnalyticsNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REPORTS.map((report) => {
          const Icon = report.icon
          return (
            <div key={report.type} className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 ${report.color}`} />
                <div>
                  <p className="font-semibold">{report.title}</p>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {PERIODS.map((p) => (
                  <ExportButton
                    key={p.value}
                    type={report.type}
                    period={p.value}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Printer className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Print / PDF Export</p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Navigate to any analytics page and use your browser&apos;s print function (Ctrl+P / Cmd+P) to save as PDF.
          Charts and tables are print-optimised.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/admin/analytics",           label: "Executive Dashboard" },
            { href: "/admin/analytics/revenue",   label: "Revenue Report" },
            { href: "/admin/analytics/orders",    label: "Orders Report" },
            { href: "/admin/analytics/customers", label: "Customer Report" },
            { href: "/admin/analytics/inventory", label: "Inventory Report" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
