import { Metadata } from "next";
import { getCurrentPeriod } from "@/lib/month";
import { getSavingsPots, getAverageMonthlyExpenses, getIncomeAvailableForPot } from "@/actions/savings";
import { getUserSettings } from "@/actions/settings";
import { getReadyToAssign } from "@/actions/budget";
import { getCurrencies } from "@/lib/currency-helpers";
import { SavingsClient } from "@/components/savings/savings-client";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsPage() {
  const settings = await getUserSettings();
  const { month, year } = getCurrentPeriod(settings?.currentBudgetMonth, settings?.currentBudgetYear);

  const [pots, currencies, avgMonthlyExpenses, incomeData, potAvailable] = await Promise.all([
    getSavingsPots(),
    getCurrencies(),
    getAverageMonthlyExpenses(),
    getReadyToAssign(month, year),
    getIncomeAvailableForPot(),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <SavingsClient
        pots={pots}
        currencies={currencies}
        avgMonthlyExpenses={avgMonthlyExpenses}
        emergencyFundMonths={settings?.emergencyFundMonths ?? 6}
        totalIncome={incomeData.totalIncome}
        incomeAvailability={potAvailable.perCurrency}
        currentPeriod={{ month, year }}
      />
    </div>
  );
}
