"use client";

import type { Ref } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSection } from "@/components/shared/form-section";
import { cn } from "@/lib/utils";
import type { CurrencyLite } from "@/components/expenses/transaction-form-helpers";

/** Amount input (plain number or a sum like 35+67), income currency toggle and exchange-rate row. */
export function AmountField({
  reg, inputRef, autoFocus, disabled, error, preview, currency, baseCurrency,
  currencies, showToggle, onCurrencyChange, isNative, rate, onRateChange, baseValue,
}: {
  reg: UseFormRegisterReturn;
  inputRef: (el: HTMLInputElement | null) => void;
  autoFocus: boolean;
  disabled: boolean;
  error?: string;
  /** Evaluated sum shown under the field when the text is an expression. */
  preview: number | null;
  currency: CurrencyLite;
  baseCurrency: CurrencyLite;
  currencies: CurrencyLite[];
  showToggle: boolean;
  onCurrencyChange: (c: CurrencyLite) => void;
  isNative: boolean;
  rate: number;
  onRateChange: (rate: number) => void;
  /** The amount converted to the base currency. */
  baseValue: number;
}) {
  return (
    <FormSection title="Amount">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount">Amount ({currency.symbol} {currency.code})</Label>
          {showToggle && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-xs flex-wrap">
              {currencies.map((c) => (
                <button key={c.id} type="button" onClick={() => onCurrencyChange(c)}
                  className={cn("px-2 py-1 rounded-md font-semibold transition-colors", currency.id === c.id ? "bg-background shadow text-foreground" : "text-muted-foreground")}>
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input id="amount" type="text" inputMode="decimal" autoComplete="off" autoFocus={autoFocus} disabled={disabled} placeholder="0.00 or a sum like 35+67" className="text-lg font-semibold" {...reg} ref={inputRef as Ref<HTMLInputElement>} />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : preview !== null ? (
          <p className="text-xs text-muted-foreground px-1">= {currency.symbol} {preview.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        ) : null}
        {isNative && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium shrink-0">1 {currency.code} =</span>
            <input type="number" step="0.01" value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value) || currency.rateToBase)}
              className="w-24 text-xs font-semibold bg-transparent border-b border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 focus:outline-none" />
            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">{baseCurrency.code}</span>
            <span className="text-xs text-blue-500 ml-auto">≈ {baseCurrency.symbol} {baseValue.toLocaleString()}</span>
          </div>
        )}
      </div>
    </FormSection>
  );
}
