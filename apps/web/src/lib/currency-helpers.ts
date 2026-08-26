import { prisma } from "@/lib/prisma";

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** The household's reporting/aggregation currency. Transaction.amount, budget
 * totals, and dashboard sums are always expressed in this currency. */
export async function getBaseCurrency(db: PrismaTx | typeof prisma = prisma) {
  const base = await db.currency.findFirst({ where: { isBase: true } });
  if (!base) throw new Error("No base currency configured");
  return base;
}

/** All currencies the household has configured, base currency first. */
export async function getCurrencies(db: PrismaTx | typeof prisma = prisma) {
  return db.currency.findMany({ orderBy: [{ isBase: "desc" }, { code: "asc" }] });
}

/** Convert an amount (in `currencyId`'s smallest unit) to base-currency smallest units. */
export async function toBaseAmount(
  amount: number,
  currencyId: string,
  db: PrismaTx | typeof prisma = prisma,
): Promise<number> {
  const currency = await db.currency.findUniqueOrThrow({ where: { id: currencyId } });
  return Math.round(amount * currency.rateToBase);
}

/** Sum every pot balance (across all currencies) for a user, converted to base-currency units. */
export async function getPotBalancesInBase(userId: string, db: PrismaTx | typeof prisma = prisma): Promise<number> {
  const balances = await db.savingsPotBalance.findMany({
    where: { pot: { userId } },
    include: { currency: true },
  });
  return balances.reduce((s, b) => s + Math.round(b.amount * b.currency.rateToBase), 0);
}
