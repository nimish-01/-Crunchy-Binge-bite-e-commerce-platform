"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"

export default function LiveRefresh() {
  const router      = useRouter()
  const [last, setLast]       = useState(new Date())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh()
      setLast(new Date())
    }, 60000) // auto-refresh every 60s
    return () => clearInterval(timer)
  }, [router])

  function manualRefresh() {
    setLoading(true)
    router.refresh()
    setLast(new Date())
    setTimeout(() => setLoading(false), 800)
  }

  return (
    <button
      onClick={manualRefresh}
      className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      <span>Refresh</span>
      <span className="text-xs text-muted-foreground">
        {last.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </button>
  )
}
