import Link from "next/link"
import { CheckCircle2, ShoppingBag, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  searchParams: Promise<{ order?: string }>
}

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams

  return (
    <div className="container max-w-lg py-20 flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-20 w-20 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your purchase. We&apos;ll start preparing your order right away.
        </p>
      </div>

      {order && (
        <Card className="w-full">
          <CardContent className="py-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Order Number</p>
              <p className="text-xl font-bold font-mono tracking-wide text-brand-400">{order}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button variant="brand" className="flex-1" asChild>
          <Link href="/orders">
            <Package className="h-4 w-4 mr-2" />
            Track My Order
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/products">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  )
}
