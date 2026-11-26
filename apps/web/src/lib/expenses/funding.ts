import { prisma } from "@/lib/prisma";
import { getBaseCurrency, getCurrencies } from "@/lib/currency-helpers";
import { computeCarry, periodKey, type PeriodNet } from "@/lib/budget/carryover";

// Shared by the "use server" expense actions (web) and the v1 bearer-auth API
// routes (mobile) - kept out of actions/expenses.ts since that file is
// "use server" and can't be imported from a plain API route handler.

export interface FundingSource {
  source: "INCOME" | "SAVINGS_POT";
  potId?: string;
  currencyId?: string; // required when source === "SAVINGS_POT"
  pkrAmount: number; // how much of the expense (base-currency units) this source covers
}

/** Convert a base-currency amount to the native units of `currency` (e.g. base paisas -> USD cents). */
export function getPotUnits(baseAmount: number, currency: { rateToBase: number }): number {
  return Math.round(baseAmount / currency.rateToBase);
}

export function incomePkrForTransaction(t: {
  amount: number;
  fundingSource: string;
  fundingSources: { source: string; pkrAmount: number }[];
}): number {
  if (t.fundingSource === "SAVINGS_POT") return 0;
  if (t.fundingSource === "SPLIT") {
    return t.fundingSources
      .filter((s) => s.source === "INCOME")
      .reduce((sum, s) => sum + s.pkrAmount, 0);
  }
  return t.amount; // INCOME - full amount
}

/** Net unspent base-currency income of every period the user has data in. */
export async function getPeriodNets(
  userId: string,
  opts?: { excludeTransactionId?: string },
): Promise<PeriodNet[]> {
  const excludeId = opts?.excludeTransactionId;
  const userPotIds = (await prisma.savingsPot.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id);
  const base = await getBaseCurrency();
  const notExcluded = excludeId ? { id: { not: excludeId } } : {};

  const [incomeRows, expenseTxns, potRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["budgetMonth", "budgetYear"],
      where: { userId, type: "INCOME", ...notExcluded },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, type: "EXPENSE", ...notExcluded },
      select: {
        amount: true, fundingSource: true, budgetMonth: true, budgetYear: true,
        fundingSources: { select: { source: true, pkrAmount: true } },
      },
    }),
    prisma.savingsPotEntry.groupBy({
      by: ["budgetMonth", "budgetYear"],
      where: {
        potId: { in: userPotIds }, sourceType: "INCOME", currencyId: base.id,
        budgetMonth: { not: null }, budgetYear: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const nets = new Map<number, number>();
  const add = (month: number, year: number, delta: number) => {
    const key = periodKey({ month, year });
    nets.set(key, (nets.get(key) ?? 0) + delta);
  };
  for (const r of incomeRows) add(r.budgetMonth, r.budgetYear, r._sum.amount ?? 0);
  for (const t of expenseTxns) add(t.budgetMonth, t.budgetYear, -incomePkrForTransaction(t));
  for (const r of potRows) {
    if (r.budgetMonth == null || r.budgetYear == null) continue;
    add(r.budgetMonth, r.budgetYear, -(r._sum.amount ?? 0));
  }
  return [...nets].map(([key, net]) => ({ key, net }));
}

/** Income a period can still use: its own unspent income plus what earlier
 * periods left, and never more than every later running total allows. */
export async function getIncomeAvailableForMonth(
  userId: string,
  month: number,
  year: number,
  excludeTransactionId?: string,
): Promise<number> {
  const nets = await getPeriodNets(userId, { excludeTransactionId });
  return computeCarry(nets, { month, year }).available;
}

/** For the budget UI: what earlier periods carry in, and what is usable now. */
export async function getIncomeCarry(
  userId: string,
  month: number,
  year: number,
): Promise<{ carryIn: number; available: number }> {
  const { carryIn, available } = computeCarry(await getPeriodNets(userId), { month, year });
  return { carryIn, available };
}

/** Income-available + pot balances for a target period - shared by the "use
 * server" web action (`getExpenseFundingContext`) and the v1 bearer-auth
 * route, so mobile and web compute this identically. */
export async function getFundingContextForMonth(userId: string, month: number, year: number) {
  const [monthlyIncomeAvailable, pots, currencies] = await Promise.all([
    getIncomeAvailableForMonth(userId, month, year),
    prisma.savingsPot.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, balances: { include: { currency: true } } },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
    getCurrencies(),
  ]);

  return { monthlyIncomeAvailable, pots, currencies };
}

export async function validateFundingSources(
  userId: string,
  sources: FundingSource[],
  month: number,
  year: number,
  excludeTransactionId?: string,
): Promise<string | null> {
  for (const src of sources) {
    if (src.source === "INCOME") {
      const available = await getIncomeAvailableForMonth(userId, month, year, excludeTransactionId);
      if (available < src.pkrAmount) {
        const base = await getBaseCurrency();
        return `Insufficient monthly income. Available: ${base.symbol} ${(available / 100).toLocaleString()}, need: ${base.symbol} ${(src.pkrAmount / 100).toLocaleString()}`;
      }
    } else {
      if (!src.potId || !src.currencyId) return "Choose a savings pot";
      const [pot, currency, balance] = await Promise.all([
        prisma.savingsPot.findFirst({ where: { id: src.potId, userId } }),
        prisma.currency.findUnique({ where: { id: src.currencyId } }),
        prisma.savingsPotBalance.findUnique({ where: { potId_currencyId: { potId: src.potId, currencyId: src.currencyId } } }),
      ]);
      if (!pot) return "Savings pot not found";
      if (!currency) return "Currency not found";
      const potUnits = getPotUnits(src.pkrAmount, currency);
      // When re-validating an edit, what the old version took from this pot is given back first.
      const restored = excludeTransactionId
        ? await potUnitsTakenBy(excludeTransactionId, src.potId, src.currencyId)
        : 0;
      const available = (balance?.amount ?? 0) + restored;
      if (available < potUnits) {
        return `Insufficient ${currency.code} balance in ${pot.name}. Available: ${currency.symbol} ${(available / 100).toLocaleString()}`;
      }
    }
  }
  return null;
}

/** How much of a pot's (currency) balance an existing expense currently holds, single or split. */
async function potUnitsTakenBy(transactionId: string, potId: string, currencyId: string): Promise<number> {
  const t = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      fundingSource: true, fundingPotId: true, fundingCurrencyId: true, fundingAmount: true,
      fundingSources: { select: { source: true, potId: true, currencyId: true, potAmount: true } },
    },
  });
  if (!t) return 0;
  if (t.fundingSource === "SAVINGS_POT") {
    return t.fundingPotId === potId && t.fundingCurrencyId === currencyId ? (t.fundingAmount ?? 0) : 0;
  }
  return t.fundingSources
    .filter((r) => r.source === "SAVINGS_POT" && r.potId === potId && r.currencyId === currencyId)
    .reduce((sum, r) => sum + (r.potAmount ?? 0), 0);
}
