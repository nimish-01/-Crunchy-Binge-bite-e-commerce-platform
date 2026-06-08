import ProductForm from "@/components/admin/product-form"
import { prisma } from "@/lib/prisma"

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Add New Product</h1>
      <ProductForm categories={categories} />
    </div>
  )
}
