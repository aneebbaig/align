import { Metadata } from "next";
import { getLoans, getLoanSummary } from "@/actions/loans";
import { getExpenseFundingContext } from "@/actions/expenses";
import { getOpenBudgetPeriod } from "@/actions/budget";
import { LoansClient } from "@/components/loans/loans-client";

export const metadata: Metadata = { title: "Loans" };

export default async function LoansPage() {
  const period = await getOpenBudgetPeriod();
  const [loans, summary, fundingContext] = await Promise.all([
    getLoans(),
    getLoanSummary(),
    getExpenseFundingContext(period.month, period.year),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <LoansClient loans={loans} summary={summary} fundingContext={fundingContext} currentPeriod={period} />
    </div>
  );
}
