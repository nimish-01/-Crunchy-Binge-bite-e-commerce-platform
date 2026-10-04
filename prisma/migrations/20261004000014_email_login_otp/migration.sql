-- CreateTable
CREATE TABLE "EmailLoginOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLoginOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLoginOtp_userId_createdAt_idx" ON "EmailLoginOtp"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLoginOtp_expiresAt_idx" ON "EmailLoginOtp"("expiresAt");

-- AddForeignKey
ALTER TABLE "EmailLoginOtp" ADD CONSTRAINT "EmailLoginOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

