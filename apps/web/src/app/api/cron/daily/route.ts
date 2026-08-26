import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, dailyDigestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sync the USD currency's rate from open.er-api.com (free, no key, 1500 req/month).
  // Only covers a household that has USD configured as a (non-base) currency - other
  // currency pairs aren't auto-synced by this free, USD-anchored API.
  let syncedRate: number | null = null;
  try {
    const [usdCurrency, base] = await Promise.all([
      prisma.currency.findUnique({ where: { code: "USD" } }),
      prisma.currency.findFirst({ where: { isBase: true } }),
    ]);
    if (usdCurrency && !usdCurrency.isBase && base) {
      const rateRes = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        const rate = rateData?.rates?.[base.code];
        if (typeof rate === "number" && rate > 0) {
          syncedRate = Math.round(rate);
          await prisma.currency.update({ where: { id: usdCurrency.id }, data: { rateToBase: syncedRate } });
        }
      }
    }
  } catch {
    // Non-fatal - continue with existing stored rate
  }

  const baseCurrency = await prisma.currency.findFirst({ where: { isBase: true } });
  const baseSymbol = baseCurrency?.symbol ?? "Rs";

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  const in7Days = new Date(now); in7Days.setDate(in7Days.getDate() + 7);

  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeftInMonth = daysInMonth - now.getDate();

  // Parallel DB fetch - all shared household data
  const [
    users,
    todayEvents,
    tomorrowEvents,
    overdueTasks,
    todayTasks,
    loansComingDue,
    monthTransactions,
    emergencyPots,
    last3MonthsExpenses,
    budgetWithCategories,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        notifyDailyDigest: true, notifyDigestTasks: true, notifyDigestCalendar: true,
        notifyLoanDue: true, notifyDigestBudget: true, notifyDigestFinancials: true,
      },
    }),
    prisma.calendarEvent.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      orderBy: { startTime: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: { date: { gte: tomorrowStart, lte: tomorrowEnd } },
      orderBy: { startTime: "asc" },
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, type: "ONE_TIME", dueDate: { lt: todayStart } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { gte: todayStart, lte: todayEnd } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    prisma.loan.findMany({
      where: { status: { not: "PAID" }, type: "GIVEN", dueDate: { gte: todayStart, lte: in7Days } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, type: true, categoryId: true },
    }),
    prisma.savingsPot.findMany({
      where: { type: "EMERGENCY" },
      select: { balances: { include: { currency: true } } },
    }),
    // Last 3 full months of expenses for avg monthly expenses calculation
    prisma.transaction.findMany({
      where: { type: "EXPENSE", date: { gte: new Date(year, month - 4, 1), lt: monthStart } },
      select: { amount: true },
    }),
    prisma.budget.findUnique({
      where: { month_year: { month, year } },
      include: { budgetCategories: { include: { category: { select: { name: true } } } } },
    }),
  ]);

  if (users.length === 0) return NextResponse.json({ ok: true, skipped: "no users" });

  // Surplus reconciliation is event-driven: it runs in startNewBudgetPeriod() when a period
  // is closed (budget.ts), not on the calendar 1st - periods no longer align with calendar months.
  const autoReconciledSurplus = 0;

  // Compute shared metrics
  const monthIncome = monthTransactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const monthExpenses = monthTransactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const noIncomeRecorded = monthIncome === 0 && now.getDate() > 5;

  const spendingByCategory: Record<string, number> = {};
  for (const t of monthTransactions.filter((t) => t.type === "EXPENSE")) {
    spendingByCategory[t.categoryId] = (spendingByCategory[t.categoryId] ?? 0) + t.amount;
  }

  const budgetAlerts = (budgetWithCategories?.budgetCategories ?? [])
    .map((bc) => ({
      categoryName: bc.category.name,
      pct: bc.allocatedAmount > 0 ? Math.round(((spendingByCategory[bc.categoryId] ?? 0) / bc.allocatedAmount) * 100) : 0,
      spent: spendingByCategory[bc.categoryId] ?? 0,
      allocated: bc.allocatedAmount,
    }))
    .filter((a) => a.pct >= 80)
    .sort((a, b) => b.pct - a.pct);

  const emergencyBalance = emergencyPots.reduce(
    (s, p) => s + p.balances.reduce((bs, b) => bs + Math.round(b.amount * b.currency.rateToBase), 0),
    0,
  );
  const avgMonthlyExpenses = last3MonthsExpenses.length > 0
    ? last3MonthsExpenses.reduce((s, t) => s + t.amount, 0) / 3
    : 0;
  const emergencyMonthsCovered = avgMonthlyExpenses > 0 ? emergencyBalance / avgMonthlyExpenses : 99;

  // Only send if there's something worth emailing
  const hasContent =
    todayEvents.length > 0 ||
    tomorrowEvents.length > 0 ||
    overdueTasks.length > 0 ||
    todayTasks.length > 0 ||
    loansComingDue.length > 0 ||
    budgetAlerts.length > 0 ||
    emergencyMonthsCovered < 3 ||
    noIncomeRecorded ||
    (daysLeftInMonth <= 7 && monthIncome > 0) ||
    autoReconciledSurplus > 0;

  if (!hasContent) {
    return NextResponse.json({ ok: true, skipped: "nothing to report", autoReconciledSurplus, syncedRate });
  }

  const digestPayload = {
    todayEvents: todayEvents.map((e) => ({ title: e.title, startTime: e.startTime, isAllDay: e.isAllDay })),
    tomorrowEvents: tomorrowEvents.map((e) => ({ title: e.title, startTime: e.startTime, isAllDay: e.isAllDay })),
    overdueTasks: overdueTasks.map((t) => ({ title: t.title, dueDate: t.dueDate })),
    todayTasks: todayTasks.map((t) => ({ title: t.title, priority: t.priority })),
    loansComingDue: loansComingDue.map((l) => ({ personName: l.personName, remainingAmount: l.remainingAmount, dueDate: l.dueDate! })),
    budgetAlerts,
    emergencyMonthsCovered,
    daysLeftInMonth,
    monthIncome,
    monthExpenses,
    noIncomeRecorded,
    autoReconciledSurplus,
  };

  let sent = 0;
  for (const user of users) {
    if (!user.notifyDailyDigest) continue;

    const firstName = user.name?.split(" ")[0] ?? "there";
    const userPayload = {
      ...digestPayload,
      todayEvents:    user.notifyDigestCalendar   ? digestPayload.todayEvents    : [],
      tomorrowEvents: user.notifyDigestCalendar   ? digestPayload.tomorrowEvents : [],
      overdueTasks:   user.notifyDigestTasks      ? digestPayload.overdueTasks   : [],
      todayTasks:     user.notifyDigestTasks      ? digestPayload.todayTasks     : [],
      loansComingDue: user.notifyLoanDue          ? digestPayload.loansComingDue : [],
      budgetAlerts:   user.notifyDigestBudget     ? digestPayload.budgetAlerts   : [],
      emergencyMonthsCovered: user.notifyDigestFinancials ? digestPayload.emergencyMonthsCovered : 99,
      noIncomeRecorded:       user.notifyDigestFinancials ? digestPayload.noIncomeRecorded       : false,
      daysLeftInMonth:        user.notifyDigestFinancials ? digestPayload.daysLeftInMonth        : 99,
    };

    const userHasContent =
      userPayload.todayEvents.length > 0 ||
      userPayload.tomorrowEvents.length > 0 ||
      userPayload.overdueTasks.length > 0 ||
      userPayload.todayTasks.length > 0 ||
      userPayload.loansComingDue.length > 0 ||
      userPayload.budgetAlerts.length > 0 ||
      (user.notifyDigestFinancials && digestPayload.emergencyMonthsCovered < 3) ||
      (user.notifyDigestFinancials && digestPayload.noIncomeRecorded) ||
      (user.notifyDigestFinancials && digestPayload.daysLeftInMonth <= 7 && digestPayload.monthIncome > 0) ||
      autoReconciledSurplus > 0;

    if (!userHasContent) continue;

    await sendEmail(
      user.email,
      `🌅 Daily digest - ${new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`,
      dailyDigestEmail({ name: firstName, ...userPayload, symbol: baseSymbol })
    );
    sent++;
  }

  return NextResponse.json({ ok: true, sent, autoReconciledSurplus, syncedRate });
}
