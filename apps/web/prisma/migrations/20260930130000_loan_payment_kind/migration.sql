-- Loan history rows now cover top-ups ("Add to loan") and write-offs as well
-- as repayments. Every existing row is a repayment.
ALTER TABLE "loan_payments" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PAYMENT';
