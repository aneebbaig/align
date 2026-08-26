-- Scoped multi-currency: pots hold a balance per currency (not fixed to
-- PKR/USD), income transactions record which currency they were entered in,
-- and the household's currency list (code/symbol/rate) becomes configurable
-- via a new `currencies` table instead of a hardcoded PKR/USD pair.
--
-- Prod has zero financial data at the time of this migration, so this drops
-- and replaces the old fixed-currency columns directly rather than backfilling.

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rateToBase" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- Seed the household's default currencies, matching the previous hardcoded
-- PKR (base) + USD (rate 278) pair so existing behavior is unchanged by default.
INSERT INTO "currencies" ("id", "code", "symbol", "rateToBase", "isBase", "updatedAt")
VALUES
    ('cur_pkr_base', 'PKR', 'Rs', 1, true, CURRENT_TIMESTAMP),
    ('cur_usd_default', 'USD', '$', 278, false, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "savings_pot_balances" (
    "id" TEXT NOT NULL,
    "potId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "savings_pot_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "savings_pot_balances_potId_currencyId_key" ON "savings_pot_balances"("potId", "currencyId");

-- CreateIndex
CREATE INDEX "savings_pot_balances_potId_idx" ON "savings_pot_balances"("potId");

-- AlterTable: savings_pots — drop the fixed PKR/USD balance columns
ALTER TABLE "savings_pots" DROP COLUMN "currentAmount",
DROP COLUMN "currentAmountUsd";

-- AlterTable: savings_pot_entries — single signed `amount` in the entry's own
-- currency instead of parallel PKR/USD columns
ALTER TABLE "savings_pot_entries" DROP COLUMN "amountUsd",
DROP COLUMN "currency",
ADD COLUMN     "currencyId" TEXT NOT NULL DEFAULT 'cur_pkr_base';
ALTER TABLE "savings_pot_entries" ALTER COLUMN "currencyId" DROP DEFAULT;

-- AlterTable: transaction_funding_sources — currency string -> currency FK
ALTER TABLE "transaction_funding_sources" DROP COLUMN "currency",
ADD COLUMN     "currencyId" TEXT;

-- AlterTable: transactions — originalCurrency/originalAmount/exchangeRate
-- (USD-income-only) generalized to nativeCurrencyId/nativeAmount/exchangeRateUsed
-- (any configured currency); fundingCurrency string -> fundingCurrencyId FK
ALTER TABLE "transactions" DROP COLUMN "originalCurrency",
DROP COLUMN "originalAmount",
DROP COLUMN "exchangeRate",
DROP COLUMN "fundingCurrency",
ADD COLUMN     "nativeCurrencyId" TEXT,
ADD COLUMN     "nativeAmount" INTEGER,
ADD COLUMN     "exchangeRateUsed" DOUBLE PRECISION,
ADD COLUMN     "fundingCurrencyId" TEXT;

-- AlterTable: users — currency (dead/decorative) and usdTopkrRate (superseded
-- by currencies.rateToBase, editable per-currency) are no longer needed
ALTER TABLE "users" DROP COLUMN "currency",
DROP COLUMN "usdTopkrRate";

-- AddForeignKey
ALTER TABLE "savings_pot_balances" ADD CONSTRAINT "savings_pot_balances_potId_fkey" FOREIGN KEY ("potId") REFERENCES "savings_pots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_pot_balances" ADD CONSTRAINT "savings_pot_balances_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_pot_entries" ADD CONSTRAINT "savings_pot_entries_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_funding_sources" ADD CONSTRAINT "transaction_funding_sources_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_nativeCurrencyId_fkey" FOREIGN KEY ("nativeCurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fundingCurrencyId_fkey" FOREIGN KEY ("fundingCurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
