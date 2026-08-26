import { Metadata } from "next";
import { getCurrentPeriod } from "@/lib/month";
import { getSavingsPots, getCumulativeSavings, getAverageMonthlyExpenses, getIncomeAvailableForPot, getFinancialPosition } from "@/actions/savings";
import { getUserSettings } from "@/actions/settings";
import { getReadyToAssign } from "@/actions/budget";
import { getCurrencies } from "@/lib/currency-helpers";
import { SavingsClient } from "@/components/savings/savings-client";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsPage() {
  const settings = await getUserSettings();
  const { month, year } = getCurrentPeriod(settings?.currentBudgetMonth, settings?.currentBudgetYear);

  const [pots, currencies, cumulativeSavings, avgMonthlyExpenses, incomeData, potAvailable, financialPosition] = await Promise.all([
    getSavingsPots(),
    getCurrencies(),
    getCumulativeSavings(),
    getAverageMonthlyExpenses(),
    getReadyToAssign(month, year),
    getIncomeAvailableForPot(),
    getFinancialPosition(),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <SavingsClient
        pots={pots}
        currencies={currencies}
        cumulativeSavings={cumulativeSavings}
        avgMonthlyExpenses={avgMonthlyExpenses}
        emergencyFundMonths={settings?.emergencyFundMonths ?? 6}
        totalIncome={incomeData.totalIncome}
        readyToAssign={incomeData.readyToAssign}
        incomeAvailability={potAvailable.perCurrency}
        liquidAvailable={financialPosition.liquidAvailable}
      />
    </div>
  );
}
