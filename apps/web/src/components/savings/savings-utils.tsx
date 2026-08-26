"use client";

import { cn } from "@/lib/utils";

export interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
export interface PotBalance { amount: number; currency: CurrencyLite; }
export interface SavingsPot {
  id: string; name: string; color: string; icon: string;
  targetAmount: number; targetDate?: string | Date | null; type: string; balances: PotBalance[];
}

export function fmt(amount: number) {
  return (amount / 100).toLocaleString();
}

export function fmtPrecise(amount: number) {
  return (amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Sum a pot's per-currency balances into base-currency smallest units. */
export function potTotalBase(pot: SavingsPot): number {
  return pot.balances.reduce((s, b) => s + Math.round(b.amount * b.currency.rateToBase), 0);
}

/** A pot's balance in one specific currency (0 if it doesn't hold that currency). */
export function potBalance(pot: SavingsPot, currencyId: string): number {
  return pot.balances.find((b) => b.currency.id === currencyId)?.amount ?? 0;
}

export function baseCurrencyOf(currencies: CurrencyLite[]): CurrencyLite {
  return currencies.find((c) => c.isBase) ?? currencies[0];
}

export function CurrencyPicker({ currencies, value, onChange }: {
  currencies: CurrencyLite[]; value: string; onChange: (currencyId: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {currencies.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            "flex-1 min-w-[76px] py-1.5 rounded-lg border text-sm font-semibold transition-colors",
            value === c.id
              ? c.isBase ? "bg-primary text-primary-foreground border-primary" : "bg-blue-600 text-white border-blue-600"
              : "border-border text-muted-foreground hover:border-primary",
          )}
        >
          {c.symbol} {c.code}
        </button>
      ))}
    </div>
  );
}
