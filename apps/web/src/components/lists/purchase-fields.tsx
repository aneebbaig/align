"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { CategoryCombobox, type ComboCategory } from "@/components/shared/category-combobox";
import { DayStrip } from "@/components/shared/day-strip";
import { MoneyInput } from "@/components/shared/money-input";
import { useLastUsedDate } from "@/components/shared/entry-date";

/** Category, amount and date for turning a list item into an expense. */
export function PurchaseFields({
  categories, categoryId, onCategoryChange, amount, onAmountChange, date, onDateChange, symbol, estimateText, autoFocusAmount,
}: {
  categories: ComboCategory[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  date: string;
  onDateChange: (d: string) => void;
  symbol: string;
  estimateText?: string | null;
  autoFocusAmount?: boolean;
}) {
  const [cats, setCats] = useState<ComboCategory[]>(categories);
  const lastUsed = useLastUsedDate();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Category <span className="text-destructive">*</span></Label>
        <CategoryCombobox
          categories={cats}
          value={categoryId}
          type="EXPENSE"
          onChange={onCategoryChange}
          onCreated={(c) => setCats((prev) => [...prev, c])}
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          Amount ({symbol})
          {estimateText && <span className="text-muted-foreground ml-1 font-normal">est. {estimateText}</span>}
        </Label>
        <MoneyInput
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0"
          autoFocus={autoFocusAmount}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Date</Label>
        <DayStrip value={date} onChange={onDateChange} lastUsed={lastUsed} />
      </div>
    </div>
  );
}
