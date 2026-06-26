import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PromotionForm from "@/components/admin/promotions/promotion-form"

export const dynamic = "force-dynamic"

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      products:   { include: { product: true } },
    },
  })

  if (!promotion) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Promotion</h1>
        <p className="text-muted-foreground text-sm mt-1">{promotion.name}</p>
      </div>
      <PromotionForm
        promotion={{
          ...promotion,
          config: promotion.config as Record<string, unknown>,
          categories: promotion.categories.map((c) => ({ category: { id: c.category.id, name: c.category.name } })),
          products:   promotion.products.map((p)   => ({ product:  { id: p.product.id,  name: p.product.name  } })),
        }}
      />
    </div>
  )
}
