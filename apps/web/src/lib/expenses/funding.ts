import { prisma } from "@/lib/prisma";
import { getBaseCurrency, getCurrencies } from "@/lib/currency-helpers";

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

export async function getIncomeAvailableForMonth(
  userId: string,
  month: number,
  year: number,
  excludeTransactionId?: string,
): Promise<number> {
  const userPotIds = (await prisma.savingsPot.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id);
  const base = await getBaseCurrency();

  const [income, expenseTxns, incomePotDeposits] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId, type: "INCOME", budgetMonth: month, budgetYear: year,
        ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId, type: "EXPENSE", budgetMonth: month, budgetYear: year,
        ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
      },
      select: { amount: true, fundingSource: true, fundingSources: { select: { source: true, pkrAmount: true } } },
    }),
    prisma.savingsPotEntry.findMany({
      where: { potId: { in: userPotIds }, sourceType: "INCOME", budgetMonth: month, budgetYear: year, currencyId: base.id },
      select: { amount: true },
    }),
  ]);

  const totalIncome = income._sum.amount ?? 0;
  const incomeFundedExpenses = expenseTxns.reduce((sum, t) => sum + incomePkrForTransaction(t), 0);
  const potDeposits = incomePotDeposits.reduce((s, e) => s + e.amount, 0);

  return totalIncome - incomeFundedExpenses - potDeposits;
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
      if ((balance?.amount ?? 0) < potUnits) {
        return `Insufficient ${currency.code} balance in ${pot.name}. Available: ${currency.symbol} ${((balance?.amount ?? 0) / 100).toLocaleString()}`;
      }
    }
  }
  return null;
}
