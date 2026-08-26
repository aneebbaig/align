-- Add SIP-style contribution ledger for investments, and link investments to
-- an investment plan category.

ALTER TABLE "investments" ADD COLUMN "planCategoryId" TEXT;

CREATE TABLE "investment_contributions" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_contributions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "investment_contributions_investmentId_idx" ON "investment_contributions"("investmentId");

CREATE INDEX "investments_planCategoryId_idx" ON "investments"("planCategoryId");

ALTER TABLE "investments" ADD CONSTRAINT "investments_planCategoryId_fkey" FOREIGN KEY ("planCategoryId") REFERENCES "investment_plan_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
