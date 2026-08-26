import { Metadata } from "next";
import { getServerUser } from "@/lib/session";
import { getCurrentPeriod } from "@/lib/month";
import { getMonthlySummary, getSpendingByCategory, getMonthlyTrend, getTransactions, getRegretPurchaseStats } from "@/actions/expenses";
import { getBudgetWithSpending } from "@/actions/budget";
import { getTodaysTasks } from "@/actions/tasks";
import { getTodaysEvents } from "@/actions/calendar";
import { getSavingsPots, getCumulativeSavings, getAverageMonthlyExpenses } from "@/actions/savings";
import { getUserSettings } from "@/actions/settings";
import { getCashflowMonthSummary, getUpcomingDueAlerts } from "@/actions/cashflow";
import { getCurrencies } from "@/lib/currency-helpers";
import { potBaseBalance } from "@/lib/currency-utils";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { CashflowSummaryCard } from "@/components/dashboard/cashflow-summary-card";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RegretBuyCard } from "@/components/dashboard/regret-buy-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerUser();
  const userSettings = await getUserSettings();
  const { month, year } = getCurrentPeriod(userSettings?.currentBudgetMonth, userSettings?.currentBudgetYear);
  const now = new Date();

  const [summary, spendingByCategory, trend, budgetData, todaysTasks, todaysEvents, savingsPots, recentTransactions, cumulativeSavings, avgMonthlyExpenses, regretStats, currencies, cashflowSummary, upcomingDue] =
    await Promise.all([
      getMonthlySummary(month, year),
      getSpendingByCategory(month, year),
      getMonthlyTrend(6),
      getBudgetWithSpending(month, year),
      getTodaysTasks(),
      getTodaysEvents(),
      getSavingsPots(),
      getTransactions({ month, year }),
      getCumulativeSavings(),
      getAverageMonthlyExpenses(),
      getRegretPurchaseStats(month, year),
      getCurrencies(),
      getCashflowMonthSummary(),
      getUpcomingDueAlerts(),
    ]);

  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  const totalSavings = savingsPots.reduce((sum, p) => sum + potBaseBalance(p.balances), 0);
  const remainingBudget = budgetData.budget
    ? budgetData.budget.totalBudget - budgetData.totalSpent
    : 0;

  const emergencyPot = savingsPots.find(
    (p) => p.type === "EMERGENCY" || p.name.toLowerCase().includes("emergency")
  );
  const emergencyBalance = emergencyPot ? potBaseBalance(emergencyPot.balances) : 0;
  const emergencyMonthsCovered = avgMonthlyExpenses > 0 ? emergencyBalance / avgMonthlyExpenses : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="text-[32px] font-bold tracking-tight text-foreground leading-none font-display">
          Good {getGreeting()}, {session?.name?.split(" ")[0]}
        </h1>
      </div>

      {/* Overview stats */}
      <OverviewCards
        totalIncome={summary.totalIncome}
        totalExpenses={summary.totalExpenses}
        remainingBudget={remainingBudget}
        netSavings={summary.netSavings}
        baseSymbol={baseSymbol}
      />

      {/* Cash-flow: this month's obligations, next due, and what's left - zero clicks */}
      <CashflowSummaryCard summary={cashflowSummary} upcoming={upcomingDue} baseSymbol={baseSymbol} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingChart data={spendingByCategory} baseSymbol={baseSymbol} />
        <TrendChart data={trend} baseSymbol={baseSymbol} />
      </div>

      {/* Budget + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetProgress categories={budgetData.categories.slice(0, 5)} totalBudget={budgetData.budget?.totalBudget ?? 0} totalSpent={budgetData.totalSpent} baseSymbol={baseSymbol} />
        <RecentTransactions transactions={recentTransactions.slice(0, 10)} baseSymbol={baseSymbol} />
      </div>

      {/* Savings overview */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h3 className="font-semibold text-foreground">Savings</h3>

          {/* Emergency fund */}
          {avgMonthlyExpenses > 0 && (() => {
            const target9 = avgMonthlyExpenses * 9;
            const pct = Math.min(100, (emergencyBalance / target9) * 100);
            const status = emergencyMonthsCovered < 3 ? "critical" : emergencyMonthsCovered < 6 ? "low" : emergencyMonthsCovered < 9 ? "ok" : "safe";
            const barColor = { critical: "bg-red-500", low: "bg-amber-400", ok: "bg-blue-400", safe: "bg-emerald-500" }[status];
            const labelColor = { critical: "text-red-500", low: "text-amber-500", ok: "text-blue-500", safe: "text-emerald-500" }[status];
            return (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground/70">Emergency Fund</span>
                  <span className={`text-xs font-bold tabnum ${labelColor}`}>{emergencyMonthsCovered.toFixed(1)} mo</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                  <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-1 tabnum">
                  Goal: 9 months · {baseSymbol} {(target9 / 100).toLocaleString()}
                </p>
              </div>
            );
          })()}

          {/* Accumulated savings */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 mb-1">
              All-time accumulated
            </p>
            <p className={`text-2xl font-bold tabnum leading-none ${cumulativeSavings.totalAccumulated >= 0 ? "text-foreground" : "text-red-500"}`}>
              {cumulativeSavings.totalAccumulated < 0 ? "-" : ""}{baseSymbol} {(Math.abs(cumulativeSavings.totalAccumulated) / 100).toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 tabnum">
              {baseSymbol} {(Math.max(0, cumulativeSavings.totalAccumulated - totalSavings) / 100).toLocaleString()} leftover, not in any pot
            </p>
          </div>

          {/* Savings pots */}
          {savingsPots.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 mb-2.5">
                In pots · {baseSymbol} {(totalSavings / 100).toLocaleString()}
              </p>
              <div className="divide-y divide-border/40">
                {savingsPots.slice(0, 3).map((pot) => (
                  <div key={pot.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pot.color }} />
                      <span className="text-sm text-foreground/80">{pot.name}</span>
                    </div>
                    <span className="text-sm font-medium tabnum">{baseSymbol} {(potBaseBalance(pot.balances) / 100).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Regret buys */}
      <RegretBuyCard stats={regretStats} baseSymbol={baseSymbol} />

      {/* Tasks + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayTasks tasks={todaysTasks} />
        <TodaySchedule events={todaysEvents} />
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
