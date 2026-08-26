import { Metadata } from "next";
import { getCurrentPeriod, prevPeriod } from "@/lib/month";
import { getExpenseFundingContext, getTransactions } from "@/actions/expenses";
import { getCategories, getUserSettings } from "@/actions/settings";
import { getBudgetWithSpending } from "@/actions/budget";
import { getPlannedExpenses } from "@/actions/cashflow";
import { ExpensesClient } from "@/components/expenses/expenses-client";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const settings = await getUserSettings();
  const { month, year } = getCurrentPeriod(settings?.currentBudgetMonth, settings?.currentBudgetYear);
  const last = prevPeriod(month, year);

  const [transactions, categories, budgetData, fundingContext, plannedExpenses] = await Promise.all([
    getTransactions({ type: "EXPENSE" }),
    getCategories(),
    getBudgetWithSpending(month, year),
    getExpenseFundingContext(month, year),
    getPlannedExpenses(),
  ]);

  const budgetByCategoryId: Record<string, { allocated: number; spent: number }> = {};
  for (const bc of budgetData.categories) {
    budgetByCategoryId[bc.categoryId] = {
      allocated: bc.allocatedAmount,
      spent: bc.spent,
    };
  }

  return (
    <div className="max-w-5xl mx-auto">
      <ExpensesClient
        transactions={transactions}
        categories={categories}
        budgetByCategoryId={budgetByCategoryId}
        fundingContext={fundingContext}
        dateFormat={settings?.dateFormat ?? "dd/MM/yyyy"}
        currentPeriod={{ month, year }}
        lastPeriod={last}
        thisMonthSpent={budgetData.totalSpent}
        budgetTotal={budgetData.totalAssigned}
        plannedExpenses={plannedExpenses}
      />
    </div>
  );
}
