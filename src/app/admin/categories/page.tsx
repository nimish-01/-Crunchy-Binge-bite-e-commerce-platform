import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import CategoryDialog from "./category-dialog"
import DeleteCategoryButton from "./delete-category-button"
import RecordCard from "@/components/admin/mobile/record-card"

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Categories</h1>
        <CategoryDialog />
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{cat.slug}</TableCell>
                <TableCell>{cat._count.products}</TableCell>
                <TableCell>{cat.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={cat.isActive ? "success" : "secondary"}>{cat.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <CategoryDialog category={cat} />
                    <DeleteCategoryButton id={cat.id} name={cat.name} productCount={cat._count.products} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {categories.map((cat) => (
          <RecordCard
            key={cat.id}
            title={cat.name}
            subtitle={cat.slug}
            badge={<Badge variant={cat.isActive ? "success" : "secondary"}>{cat.isActive ? "Active" : "Inactive"}</Badge>}
            meta={[
              { label: "Products", value: cat._count.products },
              { label: "Sort Order", value: cat.sortOrder },
            ]}
            actions={
              <>
                <CategoryDialog category={cat} />
                <DeleteCategoryButton id={cat.id} name={cat.name} productCount={cat._count.products} />
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}
