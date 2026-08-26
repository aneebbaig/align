// Pure, DB-free currency helpers usable from both server components/actions
// and client components (unlike lib/currency-helpers.ts, which hits Prisma).

export interface PotBalanceLike {
  amount: number;
  currency: { rateToBase: number };
}

/** Sum a pot's per-currency balances into base-currency smallest units. */
export function potBaseBalance(balances: PotBalanceLike[]): number {
  return balances.reduce((s, b) => s + Math.round(b.amount * b.currency.rateToBase), 0);
}

/** `symbol 1,234` — amount is in the currency's smallest unit. */
export function formatMoney(amount: number, symbol: string): string {
  return `${symbol} ${(amount / 100).toLocaleString()}`;
}

/** Two-decimal variant for currencies typically shown with cents (e.g. USD). */
export function formatMoneyPrecise(amount: number, symbol: string): string {
  return `${symbol}${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
