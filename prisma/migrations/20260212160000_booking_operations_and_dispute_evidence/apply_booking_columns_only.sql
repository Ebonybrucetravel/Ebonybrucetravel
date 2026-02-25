-- Run this in Supabase SQL Editor (one block or one statement at a time).
-- Adds the booking columns so the app stops failing.
-- If a column already exists, that line will error; skip it or comment it out.

ALTER TABLE "bookings" ADD COLUMN "cancellationDeadline" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "cancellationPolicySnapshot" TEXT;
ALTER TABLE "bookings" ADD COLUMN "clientIp" TEXT;
ALTER TABLE "bookings" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "bookings" ADD COLUMN "policyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "stripeChargeId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);
