-- Event-driven budget periods.
-- Transactions are filed under an explicit (budgetMonth, budgetYear) = the "open period"
-- when logged, decoupled from the calendar `date`. Open period stored on the user and
-- advanced manually ("Start new month") when salary lands.
-- Note: transaction + pot-entry tables were emptied prior to this migration, so the new
-- NOT NULL columns need no backfill.

-- User: replace dead monthStartDay with the open-period pointer.
ALTER TABLE "users" DROP COLUMN IF EXISTS "monthStartDay";
ALTER TABLE "users" ADD COLUMN "currentBudgetMonth" INTEGER;
ALTER TABLE "users" ADD COLUMN "currentBudgetYear" INTEGER;

-- Transaction: budget period it is filed under.
ALTER TABLE "transactions" ADD COLUMN "budgetMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "budgetYear" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "transactions" ALTER COLUMN "budgetMonth" DROP DEFAULT;
ALTER TABLE "transactions" ALTER COLUMN "budgetYear" DROP DEFAULT;
CREATE INDEX "transactions_userId_budgetMonth_budgetYear_idx" ON "transactions"("userId", "budgetMonth", "budgetYear");

-- SavingsPotEntry: budget period (nullable; set for income-sourced entries).
ALTER TABLE "savings_pot_entries" ADD COLUMN "budgetMonth" INTEGER;
ALTER TABLE "savings_pot_entries" ADD COLUMN "budgetYear" INTEGER;
