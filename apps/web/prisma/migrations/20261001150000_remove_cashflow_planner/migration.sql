-- Remove the old cash-flow planner (replaced by the standalone Planner).
-- Real transactions these features booked are untouched; only the planner's
-- own rows go.

DROP TABLE "recurring_income_occurrences";
DROP TABLE "recurring_incomes";
DROP TABLE "planned_expenses";
DROP TABLE "loan_schedules";

ALTER TABLE "users" DROP COLUMN "cashflowHorizonMonths",
DROP COLUMN "cashflowLeadTimeDays";
