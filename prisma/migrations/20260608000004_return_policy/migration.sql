-- Add returnWindowDays to Product (0 = not returnable)
ALTER TABLE "Product" ADD COLUMN "returnWindowDays" INTEGER NOT NULL DEFAULT 0;

-- Add deliveredAt to Order
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- ReturnStatus enum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- ReturnRequest table
CREATE TABLE "ReturnRequest" (
  "id"          TEXT NOT NULL,
  "orderId"     TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "reason"      TEXT NOT NULL,
  "status"      "ReturnStatus" NOT NULL DEFAULT 'PENDING',
  "adminNotes"  TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3),
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReturnRequest_orderId_key" ON "ReturnRequest"("orderId");

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
