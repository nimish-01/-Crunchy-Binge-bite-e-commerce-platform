-- Phase K: Shipping & Fulfillment Management System

-- Extend OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_TO_SHIP';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_FAILED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_APPROVED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_PICKED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_RECEIVED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_COMPLETED';

-- Extend ReturnStatus enum
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'PICKED';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- Create ShipmentStatus enum
CREATE TYPE "ShipmentStatus" AS ENUM (
  'CREATED',
  'PACKING',
  'READY_TO_SHIP',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'RETURN_INITIATED',
  'RETURN_PICKED',
  'RETURNED',
  'CANCELLED'
);

-- Extend ReturnRequest model
ALTER TABLE "ReturnRequest"
  ADD COLUMN IF NOT EXISTS "reasonDetail" TEXT,
  ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "preferredPickupDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "refundAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "refundMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "courierName" TEXT;

-- Extend DeliveryZone model
ALTER TABLE "DeliveryZone"
  ADD COLUMN IF NOT EXISTS "states" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "expressEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "expressCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "expressDaysMin" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "expressDaysMax" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "codMinOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create Courier table
CREATE TABLE IF NOT EXISTS "Courier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "website" TEXT,
  "trackingUrlPattern" TEXT,
  "supportPhone" TEXT,
  "supportEmail" TEXT,
  "logo" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- Create Shipment table
CREATE TABLE IF NOT EXISTS "Shipment" (
  "id" TEXT NOT NULL,
  "shipmentNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "courierId" TEXT,
  "trackingNumber" TEXT,
  "trackingUrl" TEXT,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
  "weightGrams" INTEGER,
  "lengthCm" DOUBLE PRECISION,
  "widthCm" DOUBLE PRECISION,
  "heightCm" DOUBLE PRECISION,
  "packageType" TEXT NOT NULL DEFAULT 'STANDARD',
  "dispatchedAt" TIMESTAMP(3),
  "estimatedDelivery" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "codCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "labelUrl" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_orderId_key" ON "Shipment"("orderId");

ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Shipment_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Shipment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create ShipmentEvent table
CREATE TABLE IF NOT EXISTS "ShipmentEvent" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "isManual" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShipmentEvent"
  ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create ShippingRate table
CREATE TABLE IF NOT EXISTS "ShippingRate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'FLAT',
  "courierId" TEXT,
  "minWeightGrams" INTEGER,
  "maxWeightGrams" INTEGER,
  "minOrderValue" DOUBLE PRECISION,
  "maxOrderValue" DOUBLE PRECISION,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isCOD" BOOLEAN NOT NULL DEFAULT false,
  "isExpress" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShippingRate"
  ADD CONSTRAINT "ShippingRate_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create ExchangeRequest table
CREATE TABLE IF NOT EXISTS "ExchangeRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originalVariantId" TEXT NOT NULL,
  "requestedVariantId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNotes" TEXT,
  "replacementShipmentId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ExchangeRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ExchangeRequest"
  ADD CONSTRAINT "ExchangeRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExchangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default courier
INSERT INTO "Courier" ("id", "name", "isActive", "priority", "updatedAt")
VALUES ('manual-courier', 'Manual / In-house', true, 100, NOW())
ON CONFLICT DO NOTHING;
