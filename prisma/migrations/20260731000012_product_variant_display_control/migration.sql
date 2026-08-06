-- AlterTable: give admins control over which variant represents a product
ALTER TABLE "ProductVariant" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: mark each product's current cheapest active variant as the
-- default (matching what every surface already shows today), and set
-- sortOrder by price ascending — this migration is visually a no-op until
-- an admin explicitly changes the default/order in the product editor.
WITH ranked AS (
  SELECT id, "productId",
         ROW_NUMBER() OVER (
           PARTITION BY "productId"
           ORDER BY "isActive" DESC, price ASC, "createdAt" ASC
         ) AS rnk
  FROM "ProductVariant"
)
UPDATE "ProductVariant" v
SET "isDefault" = true
FROM ranked r
WHERE v.id = r.id AND r.rnk = 1;

WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "productId"
           ORDER BY price ASC, "createdAt" ASC
         ) - 1 AS ord
  FROM "ProductVariant"
)
UPDATE "ProductVariant" v
SET "sortOrder" = ordered.ord
FROM ordered
WHERE v.id = ordered.id;
