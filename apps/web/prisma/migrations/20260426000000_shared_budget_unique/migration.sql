-- Drop old unique constraint (userId + month + year)
DROP INDEX IF EXISTS "budgets_userId_month_year_key";

-- Add new unique constraint (month + year only — one shared budget per month)
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_month_year_key" UNIQUE ("month", "year");
