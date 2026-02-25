-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "finalAmount" DECIMAL(12,2),
ADD COLUMN     "voucherCode" TEXT,
ADD COLUMN     "voucherDiscount" DECIMAL(12,2),
ADD COLUMN     "voucherId" TEXT;
