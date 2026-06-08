import Link from "next/link"
import { XCircle, RotateCcw, ShoppingBag, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  searchParams: Promise<{ reason?: string }>
}

export default async function OrderFailedPage({ searchParams }: Props) {
  const { reason } = await searchParams
  const displayReason = reason
    ? decodeURIComponent(reason)
    : "Your payment could not be processed. No amount has been charged."

  return (
    <div className="container max-w-lg py-20 flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-20 w-20 rounded-full bg-destructive/15 flex items-center justify-center">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">Payment Failed</h1>
        <p className="text-muted-foreground">
          {displayReason}
        </p>
      </div>

      <Card className="w-full">
        <CardContent className="py-5 space-y-2">
          <p className="text-sm font-medium">What can you do?</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Check your internet connection and try again</li>
            <li>Use a different payment method (UPI, card, netbanking)</li>
            <li>Make sure your bank hasn&apos;t blocked the transaction</li>
            <li>Your cart is saved — you can retry any time</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button variant="brand" className="flex-1" asChild>
          <Link href="/checkout">
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/products">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Headphones className="h-3.5 w-3.5" />
        Need help?{" "}
        <Link href="/contact" className="text-brand-400 hover:underline">
          Contact support
        </Link>
      </p>
    </div>
  )
}
