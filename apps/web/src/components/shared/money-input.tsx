"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { evaluateAmount } from "@/lib/amount-expr";
import { cn } from "@/lib/utils";

/**
 * The standard amount field: free text that accepts a plain number or a simple
 * sum ("35+67"), with a numeric keyboard on phones. Shows the evaluated total
 * under the field while a sum is being typed. Parse the value on submit with
 * parseMoney(); it returns major units (e.g. rupees) or null.
 */
export const MoneyInput = forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, "type" | "inputMode"> & { value: string }>(
  function MoneyInput({ value, className, ...props }, ref) {
    const r = value.trim() ? evaluateAmount(value) : null;
    const showTotal = r?.ok && r.isExpression;
    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          className={cn("tabular-nums", className)}
          {...props}
        />
        {showTotal && r?.ok && (
          <p className="text-xs text-muted-foreground tabular-nums">= {r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        )}
      </div>
    );
  },
);

/** Parses a MoneyInput value to major units, or null when empty/invalid. */
export function parseMoney(value: string): number | null {
  const r = value.trim() ? evaluateAmount(value) : null;
  return r?.ok ? r.value : null;
}
