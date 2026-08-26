/*
  Warnings:

  - You are about to drop the column `eventType` on the `wedding_vendors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "wedding_vendors" DROP COLUMN "eventType",
ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "wedding_expenses" (
    "id" TEXT NOT NULL,
    "weddingPlanId" TEXT NOT NULL,
    "eventId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MISC',
    "source1Currency" TEXT NOT NULL DEFAULT 'PKR',
    "source1Amount" INTEGER NOT NULL DEFAULT 0,
    "source1Paid" INTEGER,
    "source2Currency" TEXT,
    "source2Amount" INTEGER,
    "source2Paid" INTEGER,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wedding_expenses_weddingPlanId_idx" ON "wedding_expenses"("weddingPlanId");

-- CreateIndex
CREATE INDEX "wedding_expenses_eventId_idx" ON "wedding_expenses"("eventId");

-- CreateIndex
CREATE INDEX "wedding_vendors_eventId_idx" ON "wedding_vendors"("eventId");

-- AddForeignKey
ALTER TABLE "wedding_vendors" ADD CONSTRAINT "wedding_vendors_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_expenses" ADD CONSTRAINT "wedding_expenses_weddingPlanId_fkey" FOREIGN KEY ("weddingPlanId") REFERENCES "wedding_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_expenses" ADD CONSTRAINT "wedding_expenses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
