-- Loan.transactionId becomes optional: a loan can now be created with "skip
-- transaction" (no principal entry in Expenses/Income), matching
-- LoanPayment.transactionId which has always been nullable.
ALTER TABLE "loans" ALTER COLUMN "transactionId" DROP NOT NULL;

-- InvestmentContribution gets a transactionId link, same pattern as
-- LoanPayment - "adding money to an investment" now books a real ledger
-- Transaction (EXPENSE, "Investments" category).
ALTER TABLE "investment_contributions" ADD COLUMN "transactionId" TEXT;

CREATE UNIQUE INDEX "investment_contributions_transactionId_key" ON "investment_contributions"("transactionId");

ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
