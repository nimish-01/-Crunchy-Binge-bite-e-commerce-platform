import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import ProductCard from "@/components/shop/product-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Props {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>
}

async function Products({ searchParams }: Props) {
  const { category, sort, q } = await searchParams

  const orderBy: { createdAt: "asc" | "desc" } =
    sort === "newest" ? { createdAt: "desc" } : { createdAt: "asc" }

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { category: { slug: category } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { tags: { has: q.toLowerCase() } }] } : {}),
    },
    include: { variants: { where: { isActive: true } }, category: true },
    orderBy,
  })

  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{category ? categories.find((c) => c.slug === category)?.name ?? "Products" : "All Products"}</h1>
          <p className="text-muted-foreground mt-1">{products.length} products</p>
        </div>
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <Button variant={!category ? "brand" : "outline"} size="sm" asChild>
            <Link href="/products">All</Link>
          </Button>
          {categories.map((c) => (
            <Button key={c.id} variant={category === c.slug ? "brand" : "outline"} size="sm" asChild>
              <Link href={`/products?category=${c.slug}`}>{c.name}</Link>
            </Button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No products found.</p>
          <Button variant="brand" className="mt-4" asChild><Link href="/products">View All</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductListPage({ searchParams }: Props) {
  return (
    <Suspense fallback={
      <div className="container py-10">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
        </div>
      </div>
    }>
      <Products searchParams={searchParams} />
    </Suspense>
  )
}
