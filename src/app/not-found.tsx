import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        {/* Large emoji */}
        <div className="text-8xl mb-6" aria-hidden>🌾</div>

        {/* Status */}
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">
          Error 404
        </p>

        <h1 className="text-3xl font-bold mb-4">Page not found</h1>

        <p className="text-muted-foreground leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Head back home or browse our products.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="brand" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products" className="gap-2">
              <Search className="h-4 w-4" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
