-- Cash-flow / repayment planner (spec: repayment & cash-flow planner).
-- Additive only: 5 new tables + 2 config columns on users. No drops, no data
-- backfill required — every column is nullable or has a default.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cashflowHorizonMonths" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "cashflowLeadTimeDays" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "loan_schedules" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "flexibility" TEXT NOT NULL DEFAULT 'FIXED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "slideWindowMonths" INTEGER NOT NULL DEFAULT 0,
    "interestRate" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_incomes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "variable" BOOLEAN NOT NULL DEFAULT false,
    "countsTowardFloor" BOOLEAN NOT NULL DEFAULT true,
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "currencyId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_expenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "flexibility" TEXT NOT NULL DEFAULT 'FIXED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "slideWindowMonths" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_plans" (
    "id" TEXT NOT NULL,
    "monthlyTarget" INTEGER NOT NULL DEFAULT 0,
    "autoFromSurplus" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_plan_categories" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "investmentType" TEXT,
    "percentage" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "investment_plan_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loan_schedules_loanId_idx" ON "loan_schedules"("loanId");

-- CreateIndex
CREATE INDEX "loan_schedules_userId_idx" ON "loan_schedules"("userId");

-- CreateIndex
CREATE INDEX "recurring_incomes_userId_idx" ON "recurring_incomes"("userId");

-- CreateIndex
CREATE INDEX "planned_expenses_userId_idx" ON "planned_expenses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "investment_plans_userId_key" ON "investment_plans"("userId");

-- CreateIndex
CREATE INDEX "investment_plan_categories_planId_idx" ON "investment_plan_categories"("planId");

-- AddForeignKey
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_expenses" ADD CONSTRAINT "planned_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_expenses" ADD CONSTRAINT "planned_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_plans" ADD CONSTRAINT "investment_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_plan_categories" ADD CONSTRAINT "investment_plan_categories_planId_fkey" FOREIGN KEY ("planId") REFERENCES "investment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
