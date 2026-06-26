import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"
import { Plus, Edit, Image } from "lucide-react"
import DeleteProductButton from "./delete-product-button"
import ProductFilters from "./product-filters"
import ProductStatusToggle from "./product-status-toggle"
import { Suspense } from "react"
import type { ProductStatus } from "@prisma/client"

interface Props {
  searchParams: Promise<{ q?: string; status?: string; categoryId?: string; page?: string }>
}

const PAGE_SIZE = 20

export default async function AdminProductsPage({ searchParams }: Props) {
  const { q, status, categoryId, page } = await searchParams

  const currentPage = Math.max(1, parseInt(page ?? "1", 10))
  const skip = (currentPage - 1) * PAGE_SIZE

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status && status !== "ALL" ? { status: status as ProductStatus } : {}),
    ...(categoryId && categoryId !== "ALL" ? { categoryId } : {}),
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: { where: { isActive: true } },
        productMedia: {
          include: { mediaAsset: { select: { id: true, secureUrl: true, thumbnailUrl: true, resourceType: true, altText: true } } },
          orderBy: [{ isThumbnail: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{total} product{total !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="brand" asChild>
          <Link href="/admin/products/new"><Plus className="h-4 w-4" />Add Product</Link>
        </Button>
      </div>

      <Suspense>
        <ProductFilters categories={categories} />
      </Suspense>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Price From</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No products found.</TableCell>
              </TableRow>
            ) : products.map((product) => {
              const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.price)) : 0
              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {(() => {
                          const thumb = product.productMedia?.[0]?.mediaAsset?.secureUrl ?? product.images[0]
                          return thumb ? (
                            <img src={thumb} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Image className="h-5 w-5 text-muted-foreground" />
                          )
                        })()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{product.category.name}</Badge></TableCell>
                  <TableCell className="text-sm">{product.variants.length}</TableCell>
                  <TableCell className="font-medium text-sm">{product.variants.length > 0 ? formatPrice(minPrice) : "—"}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${totalStock === 0 ? "text-destructive" : totalStock <= 20 ? "text-yellow-400" : "text-green-400"}`}>
                      {totalStock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ProductStatusToggle id={product.id} currentStatus={product.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild><Link href={`/admin/products/${product.id}/edit`}><Edit className="h-4 w-4" /></Link></Button>
                      <DeleteProductButton id={product.id} name={product.name} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(status && status !== "ALL" ? { status } : {}), ...(categoryId && categoryId !== "ALL" ? { categoryId } : {}), page: String(currentPage - 1) }).toString()}`}>
                  Previous
                </Link>
              </Button>
            )}
            {currentPage < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(status && status !== "ALL" ? { status } : {}), ...(categoryId && categoryId !== "ALL" ? { categoryId } : {}), page: String(currentPage + 1) }).toString()}`}>
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
