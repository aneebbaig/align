-- Links the cash-flow planner's forecast rows (PlannedExpense, LoanSchedule)
-- and loan payments to the real ledger Transaction they book, so "mark paid" /
-- "record installment" actions can be undone/reversed consistently instead of
-- being a one-way status flip disconnected from the budget. Additive only -
-- every new column is nullable, one new table.

-- AlterTable
ALTER TABLE "loan_payments" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "loan_schedules" ADD COLUMN     "fulfilledPaymentId" TEXT;

-- AlterTable
ALTER TABLE "planned_expenses" ADD COLUMN     "transactionId" TEXT;

-- CreateTable
CREATE TABLE "recurring_income_occurrences" (
    "id" TEXT NOT NULL,
    "recurringIncomeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_income_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loan_payments_transactionId_key" ON "loan_payments"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "loan_schedules_fulfilledPaymentId_key" ON "loan_schedules"("fulfilledPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "planned_expenses_transactionId_key" ON "planned_expenses"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_income_occurrences_transactionId_key" ON "recurring_income_occurrences"("transactionId");

-- CreateIndex
CREATE INDEX "recurring_income_occurrences_recurringIncomeId_idx" ON "recurring_income_occurrences"("recurringIncomeId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_income_occurrences_recurringIncomeId_month_year_key" ON "recurring_income_occurrences"("recurringIncomeId", "month", "year");

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_fulfilledPaymentId_fkey" FOREIGN KEY ("fulfilledPaymentId") REFERENCES "loan_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_expenses" ADD CONSTRAINT "planned_expenses_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_income_occurrences" ADD CONSTRAINT "recurring_income_occurrences_recurringIncomeId_fkey" FOREIGN KEY ("recurringIncomeId") REFERENCES "recurring_incomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_income_occurrences" ADD CONSTRAINT "recurring_income_occurrences_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
