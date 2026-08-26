-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "isRegretPurchase" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_userId_isRegretPurchase_idx" ON "transactions"("userId", "isRegretPurchase");
