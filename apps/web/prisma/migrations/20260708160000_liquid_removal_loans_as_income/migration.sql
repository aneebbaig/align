-- Phase 8: remove Liquid Savings pot type (leftover savings is now always
-- computed live from income - expenses - pot balances, never physically
-- moved/swept) and make loans record their principal as a normal ledger
-- Transaction instead of debiting/crediting a chosen savings pot.
--
-- prisma/schema.prisma changes this pairs with:
--   - Budget.surplusReconciled removed (nothing is swept anymore)
--   - Loan.sourcePotId removed, Loan.transactionId (required, unique) added
--
-- Financial tables (transactions/budgets/loans/savings pots) are confirmed
-- empty in production, so this is a clean drop/add with no backfill.

-- AlterTable
ALTER TABLE "budgets" DROP COLUMN "surplusReconciled";

-- AlterTable
ALTER TABLE "loans" DROP COLUMN "sourcePotId";
ALTER TABLE "loans" ADD COLUMN     "transactionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "loans_transactionId_key" ON "loans"("transactionId");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
