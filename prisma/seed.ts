import { PrismaClient, UserRole, ProductStatus, CouponType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Super Admin
  const superAdminPassword = await bcrypt.hash("Admin@123", 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@bingebite.in" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@bingebite.in",
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  })

  // Admin
  const adminPassword = await bcrypt.hash("Admin@123", 12)
  await prisma.user.upsert({
    where: { email: "admin@bingebite.in" },
    update: {},
    create: {
      name: "Store Admin",
      email: "admin@bingebite.in",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
    },
  })

  // Inventory Manager
  const invPassword = await bcrypt.hash("Inventory@123", 12)
  await prisma.user.upsert({
    where: { email: "inventory@bingebite.in" },
    update: {},
    create: {
      name: "Inventory Manager",
      email: "inventory@bingebite.in",
      passwordHash: invPassword,
      role: UserRole.INVENTORY_MANAGER,
      emailVerified: new Date(),
    },
  })

  // Test Customer
  const custPassword = await bcrypt.hash("Customer@123", 12)
  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "Test Customer",
      email: "customer@example.com",
      passwordHash: custPassword,
      role: UserRole.CUSTOMER,
      emailVerified: new Date(),
    },
  })

  // Categories
  const categories = [
    { name: "Classic Flavors", slug: "classic-flavors", description: "Timeless makhana flavors", sortOrder: 1 },
    { name: "Spicy Collection", slug: "spicy-collection", description: "For the heat lovers", sortOrder: 2 },
    { name: "Sweet Treats", slug: "sweet-treats", description: "Indulgent sweet makhana", sortOrder: 3 },
    { name: "Premium Range", slug: "premium-range", description: "Our finest selection", sortOrder: 4 },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    })
  }

  const classicCategory = await prisma.category.findUnique({ where: { slug: "classic-flavors" } })
  const spicyCategory = await prisma.category.findUnique({ where: { slug: "spicy-collection" } })
  const premiumCategory = await prisma.category.findUnique({ where: { slug: "premium-range" } })

  // Products
  const products = [
    {
      name: "Himalayan Salt Makhana",
      slug: "himalayan-salt-makhana",
      shortDescription: "Lightly salted, supremely crunchy fox nuts",
      description: "Our bestselling Himalayan Salt Makhana is roasted to perfection and seasoned with pure pink Himalayan salt. Zero preservatives, 100% guilt-free snacking.",
      categoryId: classicCategory!.id,
      dietaryTags: ["Vegan", "Gluten-Free", "No Preservatives"],
      tags: ["bestseller", "classic"],
      isFeatured: true,
      nutritionalInfo: { calories: 98, protein: "4g", carbs: "18g", fat: "1g", fiber: "1g" },
    },
    {
      name: "Peri Peri Makhana",
      slug: "peri-peri-makhana",
      shortDescription: "Fiery peri peri spiced fox nuts",
      description: "Inspired by the African bird's eye chilli, our Peri Peri Makhana packs a punch. Bold flavors, clean ingredients.",
      categoryId: spicyCategory!.id,
      dietaryTags: ["Vegan", "Gluten-Free"],
      tags: ["spicy", "popular"],
      isFeatured: true,
      nutritionalInfo: { calories: 105, protein: "4g", carbs: "18g", fat: "2g", fiber: "1g" },
    },
    {
      name: "Cheese & Herbs Makhana",
      slug: "cheese-herbs-makhana",
      shortDescription: "Rich cheesy goodness with aromatic herbs",
      description: "A premium blend of cheddar flavor and Italian herbs makes this our most indulgent variety. Perfect for evening snacking.",
      categoryId: premiumCategory!.id,
      dietaryTags: ["Gluten-Free", "Vegetarian"],
      tags: ["premium", "cheesy"],
      isFeatured: false,
      nutritionalInfo: { calories: 115, protein: "5g", carbs: "17g", fat: "3g", fiber: "1g" },
    },
  ]

  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } })
    if (!existing) {
      const created = await prisma.product.create({
        data: { ...product, status: ProductStatus.ACTIVE },
      })

      // Variants for each product
      await prisma.productVariant.createMany({
        data: [
          { productId: created.id, weight: "100g", price: 149, mrp: 199, sku: `${created.id}-100g`, stock: 150, lowStockThreshold: 20 },
          { productId: created.id, weight: "200g", price: 279, mrp: 349, sku: `${created.id}-200g`, stock: 80, lowStockThreshold: 15 },
          { productId: created.id, weight: "500g", price: 599, mrp: 749, sku: `${created.id}-500g`, stock: 40, lowStockThreshold: 10 },
        ],
      })
    }
  }

  // Delivery Zone
  await prisma.deliveryZone.upsert({
    where: { id: "default-zone" },
    update: {},
    create: {
      id: "default-zone",
      name: "Metro Cities",
      pincodes: ["110001", "400001", "560001", "600001", "500001", "700001", "380001"],
      deliveryCharge: 49,
      freeDeliveryThreshold: 499,
      estimatedDaysMin: 2,
      estimatedDaysMax: 4,
      codEnabled: true,
    },
  })

  // Welcome Coupon
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: CouponType.PERCENTAGE,
      value: 10,
      minOrderValue: 199,
      maxDiscount: 100,
      totalUsageLimit: 1000,
      perUserLimit: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      description: "10% off on your first order",
      isActive: true,
    },
  })

  await prisma.coupon.upsert({
    where: { code: "FREESHIP" },
    update: {},
    create: {
      code: "FREESHIP",
      type: CouponType.FREE_SHIPPING,
      value: 0,
      minOrderValue: 299,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      description: "Free shipping on orders above ₹299",
      isActive: true,
    },
  })

  console.log("✅ Seed complete.")
  console.log("─── Login Credentials ───────────────────────────")
  console.log("Super Admin : superadmin@bingebite.in / Admin@123")
  console.log("Admin       : admin@bingebite.in       / Admin@123")
  console.log("Inventory   : inventory@bingebite.in   / Inventory@123")
  console.log("Customer    : customer@example.com     / Customer@123")
  console.log("─────────────────────────────────────────────────")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
