import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ProductForm from "@/components/admin/product-form"

interface Props { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { variants: true } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ])
  if (!product) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Edit: {product.name}</h1>
      <ProductForm categories={categories} product={product} />
    </div>
  )
}
