import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Heart } from "lucide-react"
import Link from "next/link"
import WishlistPageClient from "@/components/shop/wishlist-page-client"

export const metadata = { title: "My Wishlist — Crunchy Bingebite" }

export default async function WishlistPage() {
  const session = await auth()

  const [items, collections] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId: session!.user.id },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, images: true, status: true,
            variants: {
              where: { isActive: true },
              select: { id: true, weight: true, price: true, stock: true, isActive: true },
              orderBy: { price: "asc" as const },
              take: 1,
            },
          },
        },
        collection: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wishlistCollection.findMany({
      where: { userId: session!.user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <span className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-card py-16 text-center">
          <Heart className="h-8 w-8 mx-auto mb-3 opacity-40 text-muted-foreground" />
          <p className="text-muted-foreground">Your wishlist is empty</p>
          <Link href="/products" className="mt-3 inline-block text-sm text-brand-500 hover:underline">
            Discover products
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <WishlistPageClient items={items} collections={collections} />
      )}
    </div>
  )
}
