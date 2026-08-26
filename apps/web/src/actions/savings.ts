"use server";

import { revalidatePath } from "next/cache";
import { getUserId, getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod, getCalendarMonthRange } from "@/lib/month";
import { toPaisas } from "@/lib/utils";
import { computeFinancialPosition } from "@/lib/financial-position";
import { creditPot, debitPot } from "@/lib/pot-helpers";
import { getCurrencies, getPotBalancesInBase } from "@/lib/currency-helpers";
import { getCashflowProjection } from "@/actions/cashflow";
import { computeInvestmentSuggestion } from "@/lib/cashflow/investment-suggestion";
import { bookContributionTransaction, deleteContribution, deleteContributionTransactionsFor } from "@/lib/investment-contributions";
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

  const [monthIncomeTx, incomeFundedExpenses, existingPotDeposits] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
      select: { amount: true, nativeCurrencyId: true, nativeAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", fundingSource: "INCOME", budgetMonth: month, budgetYear: year },
      _sum: { amount: true },
    }),
    prisma.savingsPotEntry.findMany({
      where: { potId: { in: userPotIds }, sourceType: "INCOME", budgetMonth: month, budgetYear: year },
      select: { amount: true, currencyId: true },
    }),
  ]);

  const totalBaseIncome = monthIncomeTx.reduce((s, t) => s + t.amount, 0);
  const baseExpenses = incomeFundedExpenses._sum.amount ?? 0;

  const perCurrency: CurrencyAvailability[] = currencies.map((c) => {
    const deposits = existingPotDeposits.filter((e) => e.currencyId === c.id).reduce((s, e) => s + e.amount, 0);
    const available = c.isBase
      ? totalBaseIncome - baseExpenses - deposits
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

export async function addMoneyToPot(
  potId: string,
  amount: number,
  currencyId: string,
  description?: string,
  sourceType: "INCOME" | "MANUAL" = "MANUAL"
): Promise<ActionResult> {
  try {
    const authUser = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = authUser.id;
    const pot = await prisma.savingsPot.findFirst({ where: { id: potId, userId } });
    if (!pot) return { success: false, error: "Not found" };
    const currency = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!currency) return { success: false, error: "Currency not found" };

    const amountInUnits = toPaisas(amount);
    const { month, year } = getCurrentPeriod(authUser.currentBudgetMonth as number | null, authUser.currentBudgetYear as number | null);

    if (sourceType === "INCOME") {
      const userPotIds = (await prisma.savingsPot.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id);

      const [monthIncomeTx, incomeFundedExpenses, existingPotDeposits] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
          select: { amount: true, nativeCurrencyId: true, nativeAmount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: "EXPENSE", fundingSource: "INCOME", budgetMonth: month, budgetYear: year },
          _sum: { amount: true },
        }),
        prisma.savingsPotEntry.findMany({
          where: { potId: { in: userPotIds }, sourceType: "INCOME", budgetMonth: month, budgetYear: year },
          select: { amount: true, currencyId: true },
        }),
      ]);

      const deposits = existingPotDeposits.filter((e) => e.currencyId === currencyId).reduce((s, e) => s + e.amount, 0);
      if (currency.isBase) {
        const totalIncome = monthIncomeTx.reduce((s, t) => s + t.amount, 0);
        const expenses = incomeFundedExpenses._sum.amount ?? 0;
        const available = totalIncome - expenses - deposits;
        if (available < amountInUnits) {
          return { success: false, error: `Insufficient income available this month: ${currency.symbol} ${(Math.max(0, available) / 100).toLocaleString()}` };
        }
      } else {
        const nativeIncome = monthIncomeTx.filter((t) => t.nativeCurrencyId === currencyId).reduce((s, t) => s + (t.nativeAmount ?? 0), 0);
        const available = nativeIncome - deposits;
        if (available < amountInUnits) {
          return { success: false, error: `Insufficient ${currency.code} income available this month: ${currency.symbol} ${(Math.max(0, available) / 100).toLocaleString()}` };
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await creditPot(tx, potId, amountInUnits, currencyId, description ?? "Deposit", sourceType, { budgetMonth: month, budgetYear: year });
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
  currencyId: string
): Promise<ActionResult> {
  try {
    const authUser = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = authUser.id;
    const { month, year } = getCurrentPeriod(authUser.currentBudgetMonth as number | null, authUser.currentBudgetYear as number | null);
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
  description?: string
): Promise<ActionResult> {
  try {
    const authUser = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = authUser.id;
    const { month, year } = getCurrentPeriod(authUser.currentBudgetMonth as number | null, authUser.currentBudgetYear as number | null);
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
// contribution history so the UI can show accumulation over time per SIP.
export async function getInvestments() {
  const userId = await getUserId();
  return prisma.investment.findMany({
    where: { userId },
    include: { contributions: { orderBy: { date: "desc" } } },
    orderBy: { purchaseDate: "desc" },
  });
}

// Creates a SIP and logs its first contribution in one transaction - a SIP
// can't exist with a zero/undefined invested amount, so the two are inseparable.
export async function createInvestment(data: {
  name: string;
  type: string;
  platform: string;
  investedAmount: number; // first contribution, in rupees
  currentValue?: number; // defaults to investedAmount if omitted
  units?: number;
  purchaseDate: string; // date of the first contribution
  notes?: string;
  customFields?: string;
  planCategoryId?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = user.id;
    const period = getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    const firstAmount = toPaisas(data.investedAmount);
    const purchaseDate = new Date(data.purchaseDate);
    await prisma.$transaction(async (tx) => {
      const investment = await tx.investment.create({
        data: {
          name: data.name,
          type: data.type,
          platform: data.platform,
          investedAmount: firstAmount,
          currentValue: data.currentValue != null ? toPaisas(data.currentValue) : firstAmount,
          units: data.units,
          purchaseDate,
          notes: data.notes,
          customFields: data.customFields,
          planCategoryId: data.planCategoryId ?? null,
          userId,
        },
      });
      const transactionId = await bookContributionTransaction(tx, {
        userId, investmentName: data.name, amount: firstAmount, date: purchaseDate, notes: "Initial contribution", period,
      });
      await tx.investmentContribution.create({
        data: {
          investmentId: investment.id,
          amount: firstAmount,
          date: purchaseDate,
          notes: "Initial contribution",
          transactionId,
        },
      });
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[createInvestment]", e);
    return { success: false, error: "Failed to add investment" };
  }
}

// Logs a top-up against an existing SIP, any amount, any time - and keeps
// Investment.investedAmount (the cached total) in sync in the same transaction.
export async function addInvestmentContribution(
  investmentId: string,
  data: { amount: number; date: string; notes?: string },
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = user.id;
    const period = getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    const amountPaisas = toPaisas(data.amount);
    const date = new Date(data.date);
    await prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findFirst({ where: { id: investmentId, userId }, select: { id: true, name: true } });
      if (!investment) throw new Error("Investment not found");
      const transactionId = await bookContributionTransaction(tx, {
        userId, investmentName: investment.name, amount: amountPaisas, date, notes: data.notes, period,
      });
      await tx.investmentContribution.create({
        data: { investmentId, amount: amountPaisas, date, notes: data.notes, transactionId },
      });
      await tx.investment.update({
        where: { id: investmentId },
        data: { investedAmount: { increment: amountPaisas }, lastUpdated: new Date() },
      });
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[addInvestmentContribution]", e);
    return { success: false, error: "Failed to log contribution" };
  }
}

export async function deleteInvestmentContribution(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.$transaction(async (tx) => {
      const contribution = await tx.investmentContribution.findFirst({
        where: { id, investment: { userId } },
        select: { id: true, investmentId: true, amount: true, transactionId: true },
      });
      if (!contribution) return;
      await deleteContribution(tx, contribution);
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteInvestmentContribution]", e);
    return { success: false, error: "Failed to delete contribution" };
  }
}

// Mark-to-market update (current value, units, notes) - not a contribution.
export async function updateInvestment(id: string, data: {
  currentValue: number;
  units?: number;
  customFields?: string;
  notes?: string;
  planCategoryId?: string | null;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.investment.updateMany({
      where: { id, userId },
      data: {
        currentValue: toPaisas(data.currentValue),
        units: data.units,
        customFields: data.customFields,
        notes: data.notes,
        planCategoryId: data.planCategoryId,
        lastUpdated: new Date(),
      },
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    return { success: true };
  } catch (e) {
    console.error("[updateInvestment]", e);
    return { success: false, error: "Failed to update investment" };
  }
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.$transaction(async (tx) => {
      const owned = await tx.investment.findFirst({ where: { id, userId }, select: { id: true } });
      if (!owned) return;
      // Investment -> InvestmentContribution cascades on delete, but not the
      // contributions' linked Transactions - clear those first.
      await deleteContributionTransactionsFor(tx, [id]);
      await tx.investment.delete({ where: { id } });
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteInvestment]", e);
    return { success: false, error: "Failed to delete investment" };
  }
}

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

export interface InvestmentPlanCategoryInput {
  id?: string; // omit to create a new category row
  name: string;
  investmentType?: string | null; // maps to Investment.type for actual-vs-planned matching
  percentage: number; // 0-100
}

export async function getInvestmentPlan() {
  const userId = await getUserId();
  return prisma.investmentPlan.findUnique({
    where: { userId },
    include: { categories: { orderBy: { order: "asc" } } },
  });
}

export async function upsertInvestmentPlan(data: {
  monthlyTarget?: number;
  autoFromSurplus?: boolean;
  categories: InvestmentPlanCategoryInput[];
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();

    await prisma.$transaction(async (tx) => {
      const plan = await tx.investmentPlan.upsert({
        where: { userId },
        create: {
          userId,
          monthlyTarget: data.monthlyTarget != null ? toPaisas(data.monthlyTarget) : 0,
          autoFromSurplus: data.autoFromSurplus ?? true,
        },
        update: {
          ...(data.monthlyTarget != null && { monthlyTarget: toPaisas(data.monthlyTarget) }),
          ...(data.autoFromSurplus != null && { autoFromSurplus: data.autoFromSurplus }),
        },
      });

      // Diff against what's there today instead of delete-all-recreate:
      // categories are now the object users add money against (their id is
      // Investment.planCategoryId's target), so re-minting ids on every save
      // would silently unlink every SIP from its category (the FK is
      // onDelete: SetNull). Update existing rows by id, create rows with no
      // id, and delete+cascade rows no longer present.
      const existing = await tx.investmentPlanCategory.findMany({ where: { planId: plan.id }, select: { id: true } });
      const existingIds = new Set(existing.map((c) => c.id));
      const keepIds = new Set(data.categories.filter((c) => c.id).map((c) => c.id as string));
      const removedIds = [...existingIds].filter((id) => !keepIds.has(id));

      if (removedIds.length > 0) {
        // Cascades InvestmentContribution via the schema's onDelete: Cascade
        // off Investment; Investment.planCategoryId itself is SetNull so
        // this only removes investments actually linked to a removed category.
        await tx.investment.deleteMany({ where: { planCategoryId: { in: removedIds } } });
        await tx.investmentPlanCategory.deleteMany({ where: { id: { in: removedIds } } });
      }

      for (const [i, c] of data.categories.entries()) {
        if (c.id && existingIds.has(c.id)) {
          await tx.investmentPlanCategory.update({
            where: { id: c.id },
            data: { name: c.name, investmentType: c.investmentType ?? null, percentage: c.percentage, order: i },
          });
        } else {
          await tx.investmentPlanCategory.create({
            data: { planId: plan.id, name: c.name, investmentType: c.investmentType ?? null, percentage: c.percentage, order: i },
          });
        }
      }
    });

    revalidatePath("/investments");
    return { success: true };
  } catch (e) {
    console.error("[upsertInvestmentPlan]", e);
    return { success: false, error: "Failed to save investment plan" };
  }
}

// Adds money to a plan category directly - lazily creates the category's
// linked Investment on first use (name/type inherited from the category) so
// "add to plan, then add money" needs no separate SIP-creation form.
export async function addMoneyToCategory(
  planCategoryId: string,
  data: { amount: number; date: string; notes?: string },
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = user.id;
    const period = getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    const amountPaisas = toPaisas(data.amount);
    const date = new Date(data.date);
    await prisma.$transaction(async (tx) => {
      const category = await tx.investmentPlanCategory.findFirst({
        where: { id: planCategoryId, plan: { userId } },
        select: { id: true, name: true, investmentType: true },
      });
      if (!category) throw new Error("Plan category not found");

      const investment = await tx.investment.findFirst({
        where: { planCategoryId: category.id, userId },
        select: { id: true, name: true },
      });

      if (!investment) {
        // First money into this category - mirrors createInvestment: current
        // value defaults to the invested amount, then tracks separately via
        // "Update value" (mark-to-market) from here on.
        const created = await tx.investment.create({
          data: {
            name: category.name,
            type: category.investmentType ?? "OTHER",
            platform: "",
            investedAmount: amountPaisas,
            currentValue: amountPaisas,
            purchaseDate: date,
            planCategoryId: category.id,
            userId,
          },
          select: { id: true },
        });
        const transactionId = await bookContributionTransaction(tx, {
          userId, investmentName: category.name, amount: amountPaisas, date, notes: data.notes ?? "Initial contribution", period,
        });
        await tx.investmentContribution.create({
          data: { investmentId: created.id, amount: amountPaisas, date, notes: data.notes ?? "Initial contribution", transactionId },
        });
        return;
      }

      const transactionId = await bookContributionTransaction(tx, {
        userId, investmentName: investment.name, amount: amountPaisas, date, notes: data.notes, period,
      });
      await tx.investmentContribution.create({
        data: { investmentId: investment.id, amount: amountPaisas, date, notes: data.notes, transactionId },
      });
      await tx.investment.update({
        where: { id: investment.id },
        data: { investedAmount: { increment: amountPaisas }, lastUpdated: new Date() },
      });
    });
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[addMoneyToCategory]", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to add money" };
  }
}

export async function deleteInvestmentPlan(): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.investmentPlan.deleteMany({ where: { userId } });
    revalidatePath("/investments");
    return { success: true };
  } catch (e) {
    console.error("[deleteInvestmentPlan]", e);
    return { success: false, error: "Failed to delete investment plan" };
  }
}

export interface InvestmentCategorySuggestion {
  id: string;
  name: string;
  investmentType: string | null;
  percentage: number;
  plannedAmount: number; // this cycle's suggested contribution for this category
  actualAmount: number; // sum of Investment.investedAmount of matching type, purchased this period
}

export interface InvestmentSuggestion {
  hasPlan: boolean;
  monthlyIncome: number; // this period's actual income
  obligationsDue: number; // this period's due obligations (Checkpoint 1, month 1 of the projection)
  bufferTarget: number; // emergencyFundMonths x average monthly expenses
  bufferCurrent: number; // current EMERGENCY-pot balance, base currency
  bufferUnmet: number; // max(0, bufferTarget - bufferCurrent)
  suggestedTotal: number; // max(0, income - obligationsDue - bufferUnmet)
  categories: InvestmentCategorySuggestion[];
}

/**
 * Suggested investment = income − this cycle's obligations (from the cash-flow
 * scheduler) − any unmet emergency-fund buffer, then split by category. This is
 * a read-only projection - it never moves money or creates rows.
 */
export async function getInvestmentSuggestion(): Promise<InvestmentSuggestion> {
  const user = await getAuthenticatedUser({
    currentBudgetMonth: true,
    currentBudgetYear: true,
    emergencyFundMonths: true,
  });
  const userId = user.id;
  const { month, year } = getCurrentPeriod(
    user.currentBudgetMonth as number | null,
    user.currentBudgetYear as number | null,
  );

  const [plan, monthIncomeTx, projection, avgMonthlyExpenses, emergencyPots] = await Promise.all([
    prisma.investmentPlan.findUnique({
      where: { userId },
      include: { categories: { orderBy: { order: "asc" } } },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
      _sum: { amount: true },
    }),
    getCashflowProjection(),
    getAverageMonthlyExpenses(),
    prisma.savingsPot.findMany({
      where: { userId, type: "EMERGENCY" },
      include: { balances: { include: { currency: true } } },
    }),
  ]);

  const monthlyIncome = monthIncomeTx._sum.amount ?? 0;
  const obligationsDue = projection[0]?.dueTotal ?? 0;
  const bufferTarget = Math.round(avgMonthlyExpenses * (user.emergencyFundMonths as number));
  const bufferCurrent = emergencyPots.reduce(
    (sum, pot) => sum + pot.balances.reduce((s, b) => s + Math.round(b.amount * b.currency.rateToBase), 0),
    0,
  );

  if (!plan || plan.categories.length === 0) {
    const { bufferUnmet, suggestedTotal } = computeInvestmentSuggestion({
      monthlyIncome, obligationsDue, bufferTarget, bufferCurrent, categories: [],
    });
    return { hasPlan: false, monthlyIncome, obligationsDue, bufferTarget, bufferCurrent, bufferUnmet, suggestedTotal, categories: [] };
  }

  const { start, end } = getCalendarMonthRange(month, year);
  const categoryIds = plan.categories.map((c) => c.id);
  // Matched by explicit SIP -> plan category link (Investment.planCategoryId),
  // not by investmentType - multiple categories can share a type (e.g. two
  // "STOCKS" buckets for an index ETF vs. hand-picked names) and only the
  // explicit link tells them apart.
  const periodContributions = categoryIds.length > 0
    ? await prisma.investmentContribution.findMany({
        where: { date: { gte: start, lte: end }, investment: { userId, planCategoryId: { in: categoryIds } } },
        select: { amount: true, investment: { select: { planCategoryId: true } } },
      })
    : [];

  const { bufferUnmet, suggestedTotal, categories } = computeInvestmentSuggestion({
    monthlyIncome,
    obligationsDue,
    bufferTarget,
    bufferCurrent,
    categories: plan.categories.map((c) => ({
      id: c.id,
      name: c.name,
      investmentType: c.investmentType,
      percentage: c.percentage,
      actualAmount: periodContributions
        .filter((ct) => ct.investment.planCategoryId === c.id)
        .reduce((s, ct) => s + ct.amount, 0),
    })),
  });

  return { hasPlan: true, monthlyIncome, obligationsDue, bufferTarget, bufferCurrent, bufferUnmet, suggestedTotal, categories };
}
