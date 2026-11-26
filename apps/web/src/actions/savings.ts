"use server";

import { revalidatePath } from "next/cache";
import { getUserId, getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod } from "@/lib/month";
import { toPaisas } from "@/lib/utils";
import { computeFinancialPosition } from "@/lib/financial-position";
import { creditPot, debitPot } from "@/lib/pot-helpers";
import { getCurrencies } from "@/lib/currency-helpers";
import { getIncomeAvailableForMonth } from "@/lib/expenses/funding";
import { ActionResult } from "@/types";

export interface CurrencyAvailability {
  currencyId: string;
  code: string;
  symbol: string;
  isBase: boolean;
  available: number; // smallest unit of that currency
}

export async function getIncomeAvailableForPot(): Promise<{
  totalIncome: number; // base currency
  perCurrency: CurrencyAvailability[];
}> {
  const authUser = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
  const userId = authUser.id;
  const { month, year } = getCurrentPeriod(authUser.currentBudgetMonth as number | null, authUser.currentBudgetYear as number | null);

  const userPotIds = (await prisma.savingsPot.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id);
  const currencies = await getCurrencies();

  const [monthIncomeTx, baseAvailable, existingPotDeposits] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
      select: { amount: true, nativeCurrencyId: true, nativeAmount: true },
    }),
    getIncomeAvailableForMonth(userId, month, year),
    prisma.savingsPotEntry.findMany({
      where: { potId: { in: userPotIds }, sourceType: "INCOME", budgetMonth: month, budgetYear: year },
      select: { amount: true, currencyId: true },
    }),
  ]);

  const totalBaseIncome = monthIncomeTx.reduce((s, t) => s + t.amount, 0);

  const perCurrency: CurrencyAvailability[] = currencies.map((c) => {
    const deposits = existingPotDeposits.filter((e) => e.currencyId === c.id).reduce((s, e) => s + e.amount, 0);
    const available = c.isBase
      ? baseAvailable
      : monthIncomeTx.filter((t) => t.nativeCurrencyId === c.id).reduce((s, t) => s + (t.nativeAmount ?? 0), 0) - deposits;
    return { currencyId: c.id, code: c.code, symbol: c.symbol, isBase: c.isBase, available: Math.max(0, available) };
  });

  return { totalIncome: totalBaseIncome, perCurrency };
}

export async function getSavingsPots() {
  const userId = await getUserId();
  return prisma.savingsPot.findMany({
    where: { userId },
    include: { balances: { include: { currency: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createSavingsPot(data: {
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  type: string;
  targetDate?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.savingsPot.create({
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
        targetAmount: toPaisas(data.targetAmount),
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        userId,
      },
    });
    revalidatePath("/savings");
    return { success: true };
  } catch (e) {
    console.error("[createSavingsPot]", e);
    return { success: false, error: "Failed to create savings pot" };
  }
}

/** Optional "when did this happen" for pot movements: stamps the entry's date and, if given, files it under that budget period. */
export interface PotMoveOptions { date?: string; budgetMonth?: number; budgetYear?: number }

function potPeriod(open: { month: number; year: number }, opts?: PotMoveOptions) {
  return opts?.budgetMonth && opts?.budgetYear ? { month: opts.budgetMonth, year: opts.budgetYear } : open;
}

// creditPot/debitPot do not return the entry, so stamp the newest entry of this pot+currency inside the same transaction.
async function stampLatestEntryDate(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], potId: string, currencyId: string, date?: string) {
  if (!date) return;
  const when = new Date(`${date}T12:00:00`);
  if (Number.isNaN(when.getTime())) return;
  const latest = await tx.savingsPotEntry.findFirst({ where: { potId, currencyId }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (latest) await tx.savingsPotEntry.update({ where: { id: latest.id }, data: { createdAt: when } });
}

export async function addMoneyToPot(
  potId: string,
  amount: number,
  currencyId: string,
  description?: string,
  sourceType: "INCOME" | "MANUAL" = "MANUAL",
  opts?: PotMoveOptions
): Promise<ActionResult> {
  try {
    const authUser = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = authUser.id;
    const pot = await prisma.savingsPot.findFirst({ where: { id: potId, userId } });
    if (!pot) return { success: false, error: "Not found" };
    const currency = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!currency) return { success: false, error: "Currency not found" };

    const amountInUnits = toPaisas(amount);
    const { month, year } = potPeriod(getCurrentPeriod(authUser.currentBudgetMonth as number | null, authUser.currentBudgetYear as number | null), opts);

    if (sourceType === "INCOME") {
      const userPotIds = (await prisma.savingsPot.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id);

      if (currency.isBase) {
        const available = await getIncomeAvailableForMonth(userId, month, year);
        if (available < amountInUnits) {
          return { success: false, error: `Insufficient income available: ${currency.symbol} ${(Math.max(0, available) / 100).toLocaleString()}` };
        }
      } else {
        const [monthIncomeTx, existingPotDeposits] = await Promise.all([
          prisma.transaction.findMany({
            where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
            select: { nativeCurrencyId: true, nativeAmount: true },
          }),
          prisma.savingsPotEntry.findMany({
            where: { potId: { in: userPotIds }, sourceType: "INCOME", budgetMonth: month, budgetYear: year, currencyId },
            select: { amount: true },
          }),
        ]);
        const deposits = existingPotDeposits.reduce((s, e) => s + e.amount, 0);
        const nativeIncome = monthIncomeTx.filter((t) => t.nativeCurrencyId === currencyId).reduce((s, t) => s + (t.nativeAmount ?? 0), 0);
        const available = nativeIncome - deposits;
        if (available < amountInUnits) {
          return { success: false, error: `Insufficient ${currency.code} income available this month: ${currency.symbol} ${(Math.max(0, available) / 100).toLocaleString()}` };
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await creditPot(tx, potId, amountInUnits, currencyId, description ?? "Deposit", sourceType, { budgetMonth: month, budgetYear: year });
      await stampLatestEntryDate(tx, potId, currencyId, opts?.date);
    });

    revalidatePath("/savings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[addMoneyToPot]", e);
    return { success: false, error: "Failed to add money" };
  }
}

export async function transferBetweenPots(
  fromPotId: string,
  toPotId: string,
  amount: number,
  currencyId: string,
  opts?: PotMoveOptions
): Promise<ActionResult> {
  try {
    const authUser = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = authUser.id;
    const { month, year } = potPeriod(getCurrentPeriod(authUser.currentBudgetMonth as number | null, authUser.currentBudgetYear as number | null), opts);
    const [fromPot, toPot, fromBalance, currency] = await Promise.all([
      prisma.savingsPot.findFirst({ where: { id: fromPotId, userId } }),
      prisma.savingsPot.findFirst({ where: { id: toPotId, userId } }),
      prisma.savingsPotBalance.findUnique({ where: { potId_currencyId: { potId: fromPotId, currencyId } } }),
      prisma.currency.findUnique({ where: { id: currencyId } }),
    ]);
    if (!fromPot || !toPot) return { success: false, error: "Pot not found" };
    if (!currency) return { success: false, error: "Currency not found" };

    const amountInUnits = toPaisas(amount);

    if ((fromBalance?.amount ?? 0) < amountInUnits) {
      return { success: false, error: `Insufficient ${currency.code} balance` };
    }

    await prisma.$transaction(async (tx) => {
      await debitPot(tx, fromPotId, amountInUnits, currencyId, `Transfer to ${toPot.name}`, "POT_TRANSFER", { budgetMonth: month, budgetYear: year });
      await creditPot(tx, toPotId, amountInUnits, currencyId, `Transfer from ${fromPot.name}`, "POT_TRANSFER", { budgetMonth: month, budgetYear: year });
      await stampLatestEntryDate(tx, fromPotId, currencyId, opts?.date);
      await stampLatestEntryDate(tx, toPotId, currencyId, opts?.date);
    });

    revalidatePath("/savings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[transferBetweenPots]", e);
    return { success: false, error: "Failed to transfer" };
  }
}

export async function withdrawFromPot(
  potId: string,
  amount: number,
  currencyId: string,
  description?: string,
  opts?: PotMoveOptions
): Promise<ActionResult> {
  try {
    const authUser = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = authUser.id;
    const { month, year } = potPeriod(getCurrentPeriod(authUser.currentBudgetMonth as number | null, authUser.currentBudgetYear as number | null), opts);
    const [pot, balance, currency] = await Promise.all([
      prisma.savingsPot.findFirst({ where: { id: potId, userId } }),
      prisma.savingsPotBalance.findUnique({ where: { potId_currencyId: { potId, currencyId } } }),
      prisma.currency.findUnique({ where: { id: currencyId } }),
    ]);
    if (!pot) return { success: false, error: "Not found" };
    if (!currency) return { success: false, error: "Currency not found" };

    const amountInUnits = toPaisas(amount);

    if ((balance?.amount ?? 0) < amountInUnits) {
      return { success: false, error: `Insufficient ${currency.code} balance` };
    }

    await prisma.$transaction(async (tx) => {
      // sourceType INCOME so the signed-negative entry nets against income deposits,
      // freeing the income pool for re-assignment (YNAB: correction returns to Ready to Assign)
      await debitPot(tx, potId, amountInUnits, currencyId, description ?? "Correction", "INCOME", { budgetMonth: month, budgetYear: year });
      await stampLatestEntryDate(tx, potId, currencyId, opts?.date);
    });

    revalidatePath("/savings");
    return { success: true };
  } catch (e) {
    console.error("[withdrawFromPot]", e);
    return { success: false, error: "Failed to withdraw" };
  }
}

export async function deleteSavingsPot(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.savingsPot.deleteMany({ where: { id, userId } });
    revalidatePath("/savings");
    return { success: true };
  } catch (e) {
    console.error("[deleteSavingsPot]", e);
    return { success: false, error: "Failed to delete pot" };
  }
}

// SIPs (Investment rows) ordered newest-activity-first, each with its full
export async function getAverageMonthlyExpenses(): Promise<number> {
  const userId = await getUserId();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: "EXPENSE", date: { gte: sixMonthsAgo } },
    select: { amount: true, date: true },
  });

  if (transactions.length === 0) return 0;

  const byMonth: Record<string, number> = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    byMonth[key] = (byMonth[key] ?? 0) + t.amount;
  }
  const months = Object.values(byMonth);
  return months.length > 0 ? months.reduce((s, m) => s + m, 0) / months.length : 0;
}

export async function getFinancialPosition() {
  const userId = await getUserId();
  return computeFinancialPosition(userId);
}

export async function getCumulativeSavings(): Promise<{
  totalAccumulated: number;
  months: { label: string; key: string; income: number; expenses: number; surplus: number; cumulative: number }[];
}> {
  const userId = await getUserId();
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { amount: true, type: true, date: true },
    orderBy: { date: "asc" },
  });

  const byMonth: Record<string, { income: number; expenses: number }> = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0 };
    if (t.type === "INCOME") byMonth[key].income += t.amount;
    else byMonth[key].expenses += t.amount;
  }

  const sortedKeys = Object.keys(byMonth).sort();
  let cumulative = 0;
  const months = sortedKeys.map((key) => {
    const { income, expenses } = byMonth[key];
    const surplus = income - expenses;
    cumulative += surplus;
    const [year, month] = key.split("-");
    const label = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "long", year: "numeric" });
    return { label, key, income, expenses, surplus, cumulative };
  });

  return { totalAccumulated: cumulative, months };
}

// ─── Investment planning (spec Checkpoint 2) ────────────────────────────────
// Extends the existing investment module: a configurable monthly contribution
// target split by category, with a per-cycle suggestion and planned-vs-actual
// tracking. Rendered inside the existing /investments views, not a new screen.
