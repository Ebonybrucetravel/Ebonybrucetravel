/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider,providerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADMIN_CREDIT', 'ADMIN_DEBIT', 'EXPIRY', 'BONUS');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Provider" ADD VALUE 'AMADEUS';

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "currency" SET DEFAULT 'GBP';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permissions" JSONB,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "hotelName" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageType" TEXT,
    "publicId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'google_places',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage_tracking" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "currentValue" DECIMAL(12,2) NOT NULL,
    "limitValue" DECIMAL(12,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isLimitReached" BOOLEAN NOT NULL DEFAULT false,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "tier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_payment_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "cardholderName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "saved_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "price" DECIMAL(12,2),
    "currency" TEXT,
    "rating" DECIMAL(3,1),
    "providerId" TEXT,
    "provider" "Provider",
    "itemData" JSONB,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsRequired" INTEGER NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "currency" TEXT,
    "maxDiscountAmount" DECIMAL(12,2),
    "applicableProducts" JSONB,
    "minBookingAmount" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validityDays" INTEGER NOT NULL DEFAULT 90,
    "maxUsagePerUser" INTEGER,
    "maxTotalUsage" INTEGER,
    "currentUsageCount" INTEGER NOT NULL DEFAULT 0,
    "requiredTier" "LoyaltyTier",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tier_configs" (
    "id" TEXT NOT NULL,
    "tier" "LoyaltyTier" NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "pointsMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "description" TEXT,
    "benefits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_earning_rules" (
    "id" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "pointsPerUnit" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minBookingAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_earning_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardRuleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "currency" TEXT,
    "maxDiscountAmount" DECIMAL(12,2),
    "applicableProducts" JSONB,
    "minBookingAmount" DECIMAL(12,2),
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "usedAt" TIMESTAMP(3),
    "usedOnBookingId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_travelers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "relationship" TEXT,
    "passportNumber" TEXT,
    "passportCountry" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "nationalId" TEXT,
    "frequentFlyerNumber" TEXT,
    "frequentFlyerAirline" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "saved_travelers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hotel_images_hotelId_idx" ON "hotel_images"("hotelId");

-- CreateIndex
CREATE INDEX "hotel_images_expiresAt_idx" ON "hotel_images"("expiresAt");

-- CreateIndex
CREATE INDEX "hotel_images_source_idx" ON "hotel_images"("source");

-- CreateIndex
CREATE INDEX "api_usage_tracking_service_month_year_idx" ON "api_usage_tracking"("service", "month", "year");

-- CreateIndex
CREATE INDEX "api_usage_tracking_isLimitReached_idx" ON "api_usage_tracking"("isLimitReached");

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_tracking_service_metric_month_year_key" ON "api_usage_tracking"("service", "metric", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_userId_key" ON "loyalty_accounts"("userId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_userId_idx" ON "loyalty_accounts"("userId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_tier_idx" ON "loyalty_accounts"("tier");

-- CreateIndex
CREATE INDEX "loyalty_transactions_userId_idx" ON "loyalty_transactions"("userId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_type_idx" ON "loyalty_transactions"("type");

-- CreateIndex
CREATE INDEX "loyalty_transactions_referenceType_referenceId_idx" ON "loyalty_transactions"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_createdAt_idx" ON "loyalty_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_payment_methods_stripePaymentMethodId_key" ON "saved_payment_methods"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "saved_payment_methods_userId_idx" ON "saved_payment_methods"("userId");

-- CreateIndex
CREATE INDEX "saved_payment_methods_isDefault_idx" ON "saved_payment_methods"("isDefault");

-- CreateIndex
CREATE INDEX "saved_items_userId_idx" ON "saved_items"("userId");

-- CreateIndex
CREATE INDEX "saved_items_productType_idx" ON "saved_items"("productType");

-- CreateIndex
CREATE INDEX "saved_items_createdAt_idx" ON "saved_items"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_items_userId_productType_providerId_key" ON "saved_items"("userId", "productType", "providerId");

-- CreateIndex
CREATE INDEX "reward_rules_isActive_idx" ON "reward_rules"("isActive");

-- CreateIndex
CREATE INDEX "reward_rules_pointsRequired_idx" ON "reward_rules"("pointsRequired");

-- CreateIndex
CREATE INDEX "reward_rules_requiredTier_idx" ON "reward_rules"("requiredTier");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tier_configs_tier_key" ON "loyalty_tier_configs"("tier");

-- CreateIndex
CREATE INDEX "loyalty_tier_configs_minPoints_idx" ON "loyalty_tier_configs"("minPoints");

-- CreateIndex
CREATE INDEX "points_earning_rules_isActive_idx" ON "points_earning_rules"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "points_earning_rules_productType_key" ON "points_earning_rules"("productType");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_userId_idx" ON "vouchers"("userId");

-- CreateIndex
CREATE INDEX "vouchers_code_idx" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- CreateIndex
CREATE INDEX "vouchers_expiresAt_idx" ON "vouchers"("expiresAt");

-- CreateIndex
CREATE INDEX "saved_travelers_userId_idx" ON "saved_travelers"("userId");

-- CreateIndex
CREATE INDEX "saved_travelers_isDefault_idx" ON "saved_travelers"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_rewardRuleId_fkey" FOREIGN KEY ("rewardRuleId") REFERENCES "reward_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_travelers" ADD CONSTRAINT "saved_travelers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
