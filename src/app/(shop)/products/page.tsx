import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import ProductCard, { ProductCardSkeleton } from "@/components/shop/product-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SlidersHorizontal, Search, Package } from "lucide-react"

interface Props {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>
}

async function ProductGrid({ searchParams }: Props) {
  const { category, sort, q } = await searchParams

  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "price-asc"
      ? undefined
      : sort === "price-desc"
      ? undefined
      : { createdAt: "asc" as const }

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { category: { slug: category } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: {
      variants: { where: { isActive: true } },
      category: true,
      productMedia: {
        include: {
          mediaAsset: {
            select: {
              id: true, secureUrl: true, thumbnailUrl: true,
              resourceType: true, altText: true,
            },
          },
        },
        orderBy: [{ isThumbnail: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
    orderBy: orderBy ? orderBy : { createdAt: "asc" },
  })

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })

  const activeCategory = categories.find((c) => c.slug === category)
  const pageTitle = activeCategory?.name ?? (q ? `"${q}"` : "All Products")

  const SORT_OPTIONS = [
    { label: "Featured",     value: "" },
    { label: "Newest",       value: "newest" },
    { label: "Price: Low",   value: "price-asc" },
    { label: "Price: High",  value: "price-desc" },
  ]

  return (
    <div className="container py-8 sm:py-12">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {products.length} {products.length === 1 ? "product" : "products"}
              {q && <> for <span className="font-medium text-foreground">&ldquo;{q}&rdquo;</span></>}
            </p>
          </div>

          {/* Sort (desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sort:</span>
            {SORT_OPTIONS.map((opt) => {
              const href = category
                ? `/products?category=${category}${opt.value ? `&sort=${opt.value}` : ""}`
                : `/products${opt.value ? `?sort=${opt.value}` : ""}`
              return (
                <Link
                  key={opt.value}
                  href={href}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    (sort ?? "") === opt.value
                      ? "bg-brand-500/12 text-brand-400 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 mt-5 flex-wrap" role="list" aria-label="Category filters">
          <Link
            href="/products"
            role="listitem"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !category
                ? "bg-foreground text-background"
                : "border border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              role="listitem"
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === c.slug
                  ? "bg-foreground text-background"
                  : "border border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center"
          role="status"
          aria-label="No products found"
        >
          <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-5">
            {q
              ? <Search className="h-6 w-6 text-muted-foreground" />
              : <Package className="h-6 w-6 text-muted-foreground" />
            }
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {q ? "No results found" : "No products here yet"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {q
              ? `We couldn't find anything for "${q}". Try a different search term.`
              : "Check back soon — new flavors are always on their way."
            }
          </p>
          <Button variant="brand" className="mt-6" asChild>
            <Link href="/products">Browse All Products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductListSkeleton() {
  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-8">
        <div className="h-8 w-48 skeleton rounded mb-2" />
        <div className="h-4 w-24 skeleton rounded" />
        <div className="flex gap-2 mt-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 skeleton rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function ProductListPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<ProductListSkeleton />}>
      <ProductGrid searchParams={searchParams} />
    </Suspense>
  )
}
