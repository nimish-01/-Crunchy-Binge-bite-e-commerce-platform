-- Phase H: Customer Engagement & Loyalty System

-- WishlistCollection table
CREATE TABLE "WishlistCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistCollection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WishlistCollection_shareToken_key" ON "WishlistCollection"("shareToken");
CREATE UNIQUE INDEX "WishlistCollection_userId_slug_key" ON "WishlistCollection"("userId", "slug");

ALTER TABLE "WishlistCollection" ADD CONSTRAINT "WishlistCollection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add collectionId to Wishlist
ALTER TABLE "Wishlist" ADD COLUMN "collectionId" TEXT;
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "WishlistCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Wallet table
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WalletTransaction table
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ReviewHelpful table
CREATE TABLE "ReviewHelpful" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,

    CONSTRAINT "ReviewHelpful_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewHelpful_reviewId_userId_key" ON "ReviewHelpful"("reviewId", "userId");

ALTER TABLE "ReviewHelpful" ADD CONSTRAINT "ReviewHelpful_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewHelpful" ADD CONSTRAINT "ReviewHelpful_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoyaltySettings singleton
CREATE TABLE "LoyaltySettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "pointsPerRupee" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "redemptionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "maxRedemptionPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "reviewPoints" INTEGER NOT NULL DEFAULT 50,
    "referralReferrerPoints" INTEGER NOT NULL DEFAULT 100,
    "referralRefereePoints" INTEGER NOT NULL DEFAULT 50,
    "birthdayPoints" INTEGER NOT NULL DEFAULT 200,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltySettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LoyaltySettings" ("id", "updatedAt")
    VALUES ('singleton', NOW())
    ON CONFLICT ("id") DO NOTHING;

-- Review enhancements
ALTER TABLE "Review" ADD COLUMN "videos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Review" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- Order wallet tracking
ALTER TABLE "Order" ADD COLUMN "walletAmountUsed" DOUBLE PRECISION NOT NULL DEFAULT 0;
