"use server";

import { getServerUser } from "@/lib/session";
import { getUserSettings } from "@/actions/settings";
import { getCurrentPeriod } from "@/lib/month";
import { getBudgetWithSpending } from "@/actions/budget";
import { getTodaysTasks } from "@/actions/tasks";
import { getTodaysEvents } from "@/actions/calendar";
import { getSavingsPots, getAverageMonthlyExpenses } from "@/actions/savings";
import { getTransactions } from "@/actions/expenses";
import { prisma } from "@/lib/prisma";
import { CLOSED_LOAN_STATUSES } from "@/lib/loans/balance";
import { upcomingLoanAlerts } from "@/lib/loans/alerts";
import { potBaseBalance } from "@/lib/currency-utils";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { isOverdue } from "@/lib/utils";
import { format } from "date-fns";

export type AppNotification = {
  id: string;
  type: "error" | "warning" | "success" | "info";
  message: string;
};

export async function getNotifications(): Promise<AppNotification[]> {
  const user = await getServerUser();
  if (!user) return [];

  const settings = await getUserSettings();
  const { month, year } = getCurrentPeriod(settings?.currentBudgetMonth, settings?.currentBudgetYear);

  const [budgetData, todaysTasks, todaysEvents, savingsPots, avgMonthlyExpenses, recentTransactions, base, dueLoans] =
    await Promise.all([
      getBudgetWithSpending(month, year),
      getTodaysTasks(),
      getTodaysEvents(),
      getSavingsPots(),
      getAverageMonthlyExpenses(),
      getTransactions({ month, year }),
      getBaseCurrency(),
      settings?.notifyLoanDue
        ? prisma.loan.findMany({
            where: { userId: user.id, status: { notIn: CLOSED_LOAN_STATUSES }, dueDate: { not: null } },
            select: { id: true, personName: true, type: true, status: true, remainingAmount: true, dueDate: true },
          })
        : Promise.resolve([]),
    ]);

  const notifications: AppNotification[] = [];

  // Loans overdue or coming due in the next week.
  for (const due of upcomingLoanAlerts(dueLoans, new Date())) {
    const when = due.daysUntil < 0 ? `overdue since ${format(due.dueDate, "d MMM")}`
      : due.daysUntil === 0 ? "due today" : due.daysUntil === 1 ? "due tomorrow" : `due on ${format(due.dueDate, "d MMM")}`;
    const direction = due.type === "RECEIVED" ? "to" : "from";
    notifications.push({
      // Stable per loan and due date, so a dismissal sticks until the date changes.
      id: `loan-due-${due.loanId}-${due.dueDate.getTime()}`,
      type: due.daysUntil < 0 ? "error" : due.daysUntil <= 1 ? "warning" : "info",
      message: `${base.symbol} ${(due.amount / 100).toLocaleString()} ${direction} ${due.personName} ${when}`,
    });
  }

  // Doom spending - 3+ expenses in last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentExpenses = recentTransactions.filter(
    (t) => t.type === "EXPENSE" && new Date(t.date) >= twoHoursAgo
  );
  if (recentExpenses.length >= 3) {
    const total = recentExpenses.reduce((s, t) => s + t.amount, 0);
    notifications.push({
      id: "doom-spending",
      type: "error",
      message: `Doom spending alert - ${recentExpenses.length} expenses in the last 2 hours (${base.symbol} ${(total / 100).toLocaleString()})`,
    });
  }

  // Emergency fund critically low
  const emergencyPot = savingsPots.find(
    (p) => p.type === "EMERGENCY" || p.name.toLowerCase().includes("emergency")
  );
  const emergencyBalance = emergencyPot?.balances.reduce((s, b) => s + Math.round(b.amount * b.currency.rateToBase), 0) ?? 0;
  const emergencyMonthsCovered = avgMonthlyExpenses > 0 ? emergencyBalance / avgMonthlyExpenses : 0;
  if (emergencyMonthsCovered < 3) {
    notifications.push({
      id: "emergency-fund-critical",
      type: "warning",
      message: `Emergency fund critically low - ${emergencyMonthsCovered.toFixed(1)} months covered (target: 9)`,
    });
  }

  // Budget alerts
  for (const cat of budgetData.categories) {
    if (cat.percentage > 100) {
      const over = cat.spent - cat.allocatedAmount;
      notifications.push({
        id: `budget-exceeded-${cat.id}`,
        type: "error",
        message: `${cat.category.name} budget exceeded by ${base.symbol} ${(over / 100).toLocaleString()}`,
      });
    } else if (cat.percentage === 100) {
      notifications.push({
        id: `budget-full-${cat.id}`,
        type: "info",
        message: `${cat.category.name} budget fully used this month`,
      });
    } else if (cat.percentage >= 85) {
      notifications.push({
        id: `budget-warning-${cat.id}`,
        type: "warning",
        message: `${cat.category.name} at ${cat.percentage}% - approaching limit`,
      });
    }
  }

  // Targeted-pot progress (80-99%) - pots with a target are savings goals.
  for (const pot of savingsPots) {
    if (pot.targetAmount <= 0) continue;
    const saved = potBaseBalance(pot.balances);
    const pct = Math.round((saved / pot.targetAmount) * 100);
    if (pct >= 80 && pct < 100) {
      notifications.push({
        id: `pot-${pot.id}`,
        type: "success",
        message: `${pct}% towards "${pot.name}" - almost there!`,
      });
    }
  }

  // Overdue tasks
  const overdueTasks = todaysTasks.filter(
    (t) => t.type === "ONE_TIME" && isOverdue(t.dueDate) && t.status !== "DONE"
  );
  if (overdueTasks.length > 0) {
    notifications.push({
      id: "overdue-tasks",
      type: "warning",
      message: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} need attention`,
    });
  }

  // Today's reminders
  const reminders = todaysEvents.filter((e) => e.type === "REMINDER");
  if (reminders.length > 0) {
    notifications.push({
      id: "reminders",
      type: "info",
      message: `${reminders.length} reminder${reminders.length > 1 ? "s" : ""} today`,
    });
  }

  return notifications;
}
