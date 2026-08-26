import { prisma } from "@/lib/prisma";
import { getCurrencies } from "@/lib/currency-helpers";

export interface CurrencyIncomeIntegrity {
  currencyId: string;
  code: string;
  symbol: string;
  isBase: boolean;
  totalIncome: number; // base units for the base currency, native units otherwise
  expenses: number; // only meaningful for the base currency (expenses are always base-currency)
  potDeposits: number; // deposited into pots from this currency's income, in this currency's units
}

export interface IncomeIntegrityData {
  perCurrency: CurrencyIncomeIntegrity[];
}

export function baseIntegrity(data: IncomeIntegrityData): CurrencyIncomeIntegrity {
  const base = data.perCurrency.find((c) => c.isBase);
  if (!base) throw new Error("No base currency configured");
  return base;
}

export async function fetchMonthIncomeIntegrityData(
  userId: string,
  month: number,
  year: number,
): Promise<IncomeIntegrityData> {
  const userPotIds = (
    await prisma.savingsPot.findMany({ where: { userId }, select: { id: true } })
  ).map((p) => p.id);
  const currencies = await getCurrencies();

  const [allMonthIncome, incomeFundedExpenses, incomePotEntries, nativeIncomeTx] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", fundingSource: "INCOME", budgetMonth: month, budgetYear: year },
      _sum: { amount: true },
    }),
    prisma.savingsPotEntry.findMany({
      where: { potId: { in: userPotIds }, sourceType: "INCOME", budgetMonth: month, budgetYear: year },
      select: { amount: true, currencyId: true },
    }),
    prisma.transaction.findMany({
      where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year, nativeCurrencyId: { not: null } },
      select: { nativeCurrencyId: true, nativeAmount: true },
    }),
  ]);

  const perCurrency: CurrencyIncomeIntegrity[] = currencies.map((c) => {
    const potDeposits = incomePotEntries.filter((e) => e.currencyId === c.id).reduce((s, e) => s + e.amount, 0);
    if (c.isBase) {
      return {
        currencyId: c.id, code: c.code, symbol: c.symbol, isBase: true,
        totalIncome: allMonthIncome._sum.amount ?? 0,
        expenses: incomeFundedExpenses._sum.amount ?? 0,
        potDeposits,
      };
    }
    const totalIncome = nativeIncomeTx.filter((t) => t.nativeCurrencyId === c.id).reduce((s, t) => s + (t.nativeAmount ?? 0), 0);
    return { currencyId: c.id, code: c.code, symbol: c.symbol, isBase: false, totalIncome, expenses: 0, potDeposits };
  });

  return { perCurrency };
}
