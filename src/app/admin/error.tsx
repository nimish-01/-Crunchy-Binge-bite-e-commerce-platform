"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw, Database } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Admin Error]", error)
  }, [error])

  const isDbColdStart =
    error.message?.includes("Can't reach database") ||
    error.message?.includes("P1001") ||
    error.message?.includes("ECONNREFUSED") ||
    error.message?.includes("connect_timeout") ||
    error.message?.includes("connection pool") ||
    error.message?.includes("pool_timeout")

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center">
      <div className={`h-14 w-14 rounded-full flex items-center justify-center ${isDbColdStart ? "bg-amber-500/10" : "bg-destructive/10"}`}>
        {isDbColdStart ? (
          <Database className="h-7 w-7 text-amber-400" />
        ) : (
          <AlertCircle className="h-7 w-7 text-destructive" />
        )}
      </div>

      <div className="max-w-sm">
        <h2 className="text-lg font-semibold mb-2">
          {isDbColdStart ? "Database is waking up" : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          {isDbColdStart
            ? "The database server is resuming from sleep mode. This usually resolves within a few seconds — click Try Again to reload."
            : error.message ?? "An unexpected error occurred. Please try again."}
        </p>
        <Button onClick={reset} variant="brand" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  )
}
