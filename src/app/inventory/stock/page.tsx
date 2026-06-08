import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StockReceiveForm from "./stock-receive-form"
import StockAdjustForm from "./stock-adjust-form"
import StockDamageForm from "./stock-damage-form"

export default async function StockManagementPage() {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: {
      product: { select: { id: true, name: true, images: true } },
    },
    orderBy: [{ product: { name: "asc" } }, { price: "asc" }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Receive new stock, make adjustments, or record damaged goods.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="receive">
            <TabsList className="mb-6">
              <TabsTrigger value="receive">Receive Stock</TabsTrigger>
              <TabsTrigger value="adjust">Manual Adjustment</TabsTrigger>
              <TabsTrigger value="damage">Record Damage</TabsTrigger>
            </TabsList>

            <TabsContent value="receive">
              <StockReceiveForm variants={variants} />
            </TabsContent>

            <TabsContent value="adjust">
              <StockAdjustForm variants={variants} />
            </TabsContent>

            <TabsContent value="damage">
              <StockDamageForm variants={variants} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
