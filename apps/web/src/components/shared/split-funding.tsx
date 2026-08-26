"use client";

import { CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SplitSourceRow {
  value: string;
  pkrAmount: string;
}

export interface FundingOption {
  value: string;
  label: string;
  /** "income" reacts to the budget-period checkbox/date; "pot" is always a
   * global, period-independent balance. Grouped separately in the dropdown
   * so the two very different kinds of "available money" aren't confused. */
  group: "income" | "pot";
}

const fmt = (paisas: number) => (paisas / 100).toLocaleString();

/** Shared grouped dropdown content - income (period-scoped) vs savings pots
 * (global), reused by the single-source picker and both split-funding rows. */
export function FundingSelectContent({ options }: { options: FundingOption[] }) {
  const income = options.filter((o) => o.group === "income");
  const pots = options.filter((o) => o.group === "pot");
  return (
    <SelectContent>
      {income.length > 0 && (
        <SelectGroup>
          <SelectLabel>This period&apos;s income</SelectLabel>
          {income.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectGroup>
      )}
      {pots.length > 0 && (
        <SelectGroup>
          <SelectLabel>Savings pots</SelectLabel>
          {pots.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectGroup>
      )}
    </SelectContent>
  );
}

/**
 * Shared two-source split funding control (inline-remainder UX). The caller supplies the
 * dropdown options (each form encodes `value` its own way) and owns the [primary, secondary]
 * rows; this component renders the layout: pick + amount the primary, secondary auto-covers
 * the rest. Used by the expense form and the loan-repayment form so the UX lives in one place.
 */
export function SplitFunding({
  totalAmount,
  options,
  value,
  onChange,
  baseSymbol = "Rs",
}: {
  totalAmount: number; // base-currency units (not smallest unit)
  options: FundingOption[];
  value: SplitSourceRow[]; // [primary, secondary]
  onChange: (rows: SplitSourceRow[]) => void;
  baseSymbol?: string;
}) {
  const fallback = options[0]?.value ?? "INCOME";
  const primary = value[0] ?? { value: fallback, pkrAmount: "" };
  const secondary = value[1] ?? { value: fallback, pkrAmount: "" };

  const totalPaisas = Math.round(totalAmount * 100);
  const primaryPaisas = Math.round(parseFloat(primary.pkrAmount || "0") * 100) || 0;
  const remainderPaisas = totalPaisas - primaryPaisas;
  const over = remainderPaisas < 0;

  const setPrimary = (p: Partial<SplitSourceRow>) => onChange([{ ...primary, ...p }, secondary]);
  const setSecondary = (p: Partial<SplitSourceRow>) => onChange([primary, { ...secondary, ...p }]);

  return (
    <div className="space-y-1.5">
      {/* Primary source - you choose how much comes from here */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
        <Select value={primary.value} onValueChange={(v) => setPrimary({ value: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <FundingSelectContent options={options} />
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Amount {baseSymbol}</span>
          <Input
            type="number"
            placeholder="0.00"
            className={cn("h-9", over && "border-rose-400 focus-visible:ring-rose-400")}
            value={primary.pkrAmount}
            onChange={(e) => setPrimary({ pkrAmount: e.target.value })}
          />
        </div>
      </div>

      {/* Remainder flows to the secondary source */}
      <p className={cn("flex items-center gap-1.5 pl-3 text-xs", over ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
        <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
        {over
          ? `Over by ${baseSymbol} ${fmt(Math.abs(remainderPaisas))} - lower the amount above`
          : <>remaining <span className="font-semibold text-foreground">{baseSymbol} {fmt(remainderPaisas)}</span> from</>}
      </p>
      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <Select value={secondary.value} onValueChange={(v) => setSecondary({ value: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <FundingSelectContent options={options} />
        </Select>
      </div>
    </div>
  );
}
