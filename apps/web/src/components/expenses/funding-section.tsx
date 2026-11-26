"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/shared/form-section";
import { SplitFunding, FundingSelectContent, type FundingOption } from "@/components/shared/split-funding";
import { cn } from "@/lib/utils";
import { type SplitSource } from "@/components/expenses/transaction-form-helpers";
import { formatAmount } from "@/lib/currency-utils";

/** "Pay from": a collapsed "Paid from income" line, a single-source picker, or a split across sources. */
export function FundingSection({
  options, loading, collapsed, isNew, symbol, incomeLeft, totalAmount,
  useSplit, single, splitSources,
  onShowControls, onSingleChange, onSplitSourcesChange, onUseSplit,
}: {
  options: FundingOption[];
  loading: boolean;
  collapsed: boolean;
  isNew: boolean;
  symbol: string;
  incomeLeft: number;
  totalAmount: number;
  useSplit: boolean;
  single: string;
  splitSources: SplitSource[];
  onShowControls: () => void;
  onSingleChange: (v: string) => void;
  onSplitSourcesChange: (s: SplitSource[]) => void;
  onUseSplit: (split: boolean) => void;
}) {
  return (
    <FormSection title="Funding">
      <div className={cn("space-y-2 transition-opacity", loading && "opacity-60")}>
        {collapsed ? (
          <div className="flex items-center gap-2 text-sm">
            <span>Paid from income · {symbol} {formatAmount(incomeLeft)} left</span>
            <button type="button" onClick={onShowControls} className="text-xs text-primary hover:underline font-medium">Change</button>
          </div>
        ) : !useSplit ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Pay from</Label>
              <button type="button" onClick={() => onUseSplit(true)} className="text-xs text-primary hover:underline font-medium">
                + Split across two sources
              </button>
            </div>
            <Select value={single} onValueChange={onSingleChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <FundingSelectContent options={options} />
            </Select>
            {(!isNew || single !== "INCOME") && (
              <p className="text-xs text-muted-foreground px-1">
                Choosing a savings pot deducts immediately and is reversed if you delete this expense.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pay from (split)</Label>
              <button type="button" onClick={() => onUseSplit(false)} className="text-xs text-muted-foreground hover:underline">
                Use single source
              </button>
            </div>
            <SplitFunding totalAmount={totalAmount} options={options} value={splitSources} onChange={onSplitSourcesChange} baseSymbol={symbol} />
          </div>
        )}
      </div>
    </FormSection>
  );
}
