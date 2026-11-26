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

/** `1,234` - amount is in the currency's smallest unit. Canonical number formatter. */
export function formatAmount(amount: number, locale?: string): string {
  return (amount / 100).toLocaleString(locale);
}

/** Two-decimal variant for currencies typically shown with cents (e.g. USD). */
export function formatAmountPrecise(amount: number): string {
  return (amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** `symbol 1,234` - amount is in the currency's smallest unit. */
export function formatMoney(amount: number, symbol: string, locale?: string): string {
  return `${symbol} ${formatAmount(amount, locale)}`;
}
