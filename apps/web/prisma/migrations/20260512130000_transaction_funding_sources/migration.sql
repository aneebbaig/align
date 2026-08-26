-- AlterTable
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "fundingSource" TEXT NOT NULL DEFAULT 'INCOME';
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "fundingPotId" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "fundingCurrency" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "fundingAmount" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_fundingPotId_idx" ON "transactions"("fundingPotId");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fundingPotId_fkey" FOREIGN KEY ("fundingPotId") REFERENCES "savings_pots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
