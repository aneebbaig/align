-- This table already exists on production (created out-of-band, without a
-- migration) -- this migration backfills the missing history so fresh/dev
-- databases get it too. IF NOT EXISTS guards make it a no-op on prod.

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction_funding_sources" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "potId" TEXT,
    "currency" TEXT,
    "potAmount" INTEGER,
    "pkrAmount" INTEGER NOT NULL,

    CONSTRAINT "transaction_funding_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transaction_funding_sources_transactionId_idx" ON "transaction_funding_sources"("transactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transaction_funding_sources_potId_idx" ON "transaction_funding_sources"("potId");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "transaction_funding_sources" ADD CONSTRAINT "transaction_funding_sources_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "transaction_funding_sources" ADD CONSTRAINT "transaction_funding_sources_potId_fkey" FOREIGN KEY ("potId") REFERENCES "savings_pots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
