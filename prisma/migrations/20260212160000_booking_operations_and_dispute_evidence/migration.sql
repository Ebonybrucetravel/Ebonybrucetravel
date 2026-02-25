-- CreateEnum
CREATE TYPE "CancellationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable (BOOKING_OPERATIONS_AND_RISK: dispute evidence and cancellation policy)
ALTER TABLE "bookings" ADD COLUMN "cancellationDeadline" TIMESTAMP(3),
ADD COLUMN "cancellationPolicySnapshot" TEXT,
ADD COLUMN "clientIp" TEXT,
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "policyAcceptedAt" TIMESTAMP(3),
ADD COLUMN "stripeChargeId" TEXT,
ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);

-- CreateTable (after-deadline cancellation requests - admin queue)
CREATE TABLE "cancellation_requests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "refundAmount" DECIMAL(12,2),
    "refundStatus" "RefundStatus",
    "rejectionReason" TEXT,

    CONSTRAINT "cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cancellation_requests_bookingId_idx" ON "cancellation_requests"("bookingId");
CREATE INDEX "cancellation_requests_status_idx" ON "cancellation_requests"("status");
CREATE INDEX "cancellation_requests_requestedAt_idx" ON "cancellation_requests"("requestedAt");

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
