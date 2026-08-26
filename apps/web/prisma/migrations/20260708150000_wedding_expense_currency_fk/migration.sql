-- Generalize WeddingExpense's hardcoded "PKR"|"USD" string currencies into
-- proper FKs against the household's configured Currency list. Data-preserving:
-- backfill from the literal string values before dropping them.

-- AlterTable: add new nullable FK columns
ALTER TABLE "wedding_expenses" ADD COLUMN     "source1CurrencyId" TEXT;
ALTER TABLE "wedding_expenses" ADD COLUMN     "source2CurrencyId" TEXT;

-- Backfill from old string enum ("PKR"/"USD") to the seeded Currency rows
UPDATE "wedding_expenses"
SET "source1CurrencyId" = CASE WHEN "source1Currency" = 'USD' THEN 'cur_usd_default' ELSE 'cur_pkr_base' END;

UPDATE "wedding_expenses"
SET "source2CurrencyId" = CASE
  WHEN "source2Currency" = 'USD' THEN 'cur_usd_default'
  WHEN "source2Currency" = 'PKR' THEN 'cur_pkr_base'
  ELSE NULL
END;

-- Make source1CurrencyId required now that it's backfilled
ALTER TABLE "wedding_expenses" ALTER COLUMN "source1CurrencyId" SET NOT NULL;

-- Drop old string enum columns
ALTER TABLE "wedding_expenses" DROP COLUMN "source1Currency";
ALTER TABLE "wedding_expenses" DROP COLUMN "source2Currency";

-- AddForeignKey
ALTER TABLE "wedding_expenses" ADD CONSTRAINT "wedding_expenses_source1CurrencyId_fkey" FOREIGN KEY ("source1CurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_expenses" ADD CONSTRAINT "wedding_expenses_source2CurrencyId_fkey" FOREIGN KEY ("source2CurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
