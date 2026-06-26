"use client"

import { useState } from "react"
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react"

interface Props {
  type:   string  // "sales" | "customers" | "inventory"
  period: string
}

export default function ExportButton({ type, period }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [open, setOpen]       = useState(false)

  async function exportCsv() {
    setLoading("csv")
    setOpen(false)
    const res = await fetch(`/api/admin/analytics/export?type=${type}&period=${period}&format=csv`)
    if (!res.ok) { setLoading(null); return }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `${type}-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setLoading(null)
  }

  async function exportExcel() {
    setLoading("xlsx")
    setOpen(false)
    const res  = await fetch(`/api/admin/analytics/export?type=${type}&period=${period}&format=json`)
    const data = await res.json()
    if (!data.success || !data.rows?.length) { setLoading(null); return }

    const { utils, writeFile } = await import("xlsx")
    const ws = utils.json_to_sheet(data.rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, type)
    writeFile(wb, `${type}-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    setLoading(null)
  }

  function printPdf() {
    setOpen(false)
    window.print()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 w-44">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4 text-green-500" />
              Export CSV
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              Export Excel
            </button>
            <button
              onClick={printPdf}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4 text-red-500" />
              Print / PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
