import { Metadata } from "next";
import { getInvestments, getInvestmentPlan, getInvestmentSuggestion } from "@/actions/savings";
import { getOpenBudgetPeriod } from "@/actions/budget";
import { getCurrencies } from "@/lib/currency-helpers";
import { InvestmentsClient } from "@/components/investments/investments-client";

export const metadata: Metadata = { title: "Investments" };

export default async function InvestmentsPage() {
  const [investments, currencies, plan, suggestion, currentPeriod] = await Promise.all([
    getInvestments(),
    getCurrencies(),
    getInvestmentPlan(),
    getInvestmentSuggestion(),
    getOpenBudgetPeriod(),
  ]);
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  return (
    <div className="max-w-5xl mx-auto">
      <InvestmentsClient
        investments={investments}
        baseSymbol={baseSymbol}
        plan={plan}
        suggestion={suggestion}
        currentPeriod={currentPeriod}
      />
    </div>
  );
}
