-- Contributions can now be withdrawals as well as deposits. Existing rows are
-- all deposits, which is what the default gives them.
ALTER TABLE "investment_contributions" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'DEPOSIT';
