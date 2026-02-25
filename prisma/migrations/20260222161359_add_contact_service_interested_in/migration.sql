/*
  Warnings:

  - Added the required column `serviceInterestedIn` to the `contact_submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contact_submissions" ADD COLUMN     "serviceInterestedIn" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "contact_submissions_serviceInterestedIn_idx" ON "contact_submissions"("serviceInterestedIn");
