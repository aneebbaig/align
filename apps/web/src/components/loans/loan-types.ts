export interface LoansSummary { totalGiven: number; totalReceived: number; netPosition: number; }
export interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
export interface PotBalance { amount: number; currency: CurrencyLite; }
export interface FundingPot { id: string; name: string; type: string; balances: PotBalance[]; }
export interface FundingContext { monthlyIncomeAvailable: number; currencies: CurrencyLite[]; pots: FundingPot[]; }
export interface PeriodRef { month: number; year: number }

// Loans only ever move money in the household's base currency.
export function baseBalance(pot: { balances: PotBalance[] }): number {
  return pot.balances.find((b) => b.currency.isBase)?.amount ?? 0;
}

/** Selects the whole value when an amount field is focused, so typing replaces a prefill. */
export function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.select();
}
