-- AlterTable (Admin: customer suspend + internal notes)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;

-- CreateIndex (idempotent: only if not exists)
CREATE INDEX IF NOT EXISTS "users_suspendedAt_idx" ON "users"("suspendedAt");
