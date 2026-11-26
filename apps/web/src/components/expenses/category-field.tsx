"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { CategoryCombobox, type ComboCategory } from "@/components/shared/category-combobox";
import { cn } from "@/lib/utils";

/** Category chips (last used first, then top categories), the combobox, and the budget hint. */
export function CategoryField({
  categories, chips, lastUsedId, value, type, invalid, error, budget, symbol, showNoBudget, onChange, onCreated,
}: {
  categories: ComboCategory[];
  /** Quick chips, already ordered; the one matching `lastUsedId` is highlighted. */
  chips: ComboCategory[];
  lastUsedId: string | null;
  value: string;
  type: "EXPENSE" | "INCOME";
  invalid: boolean;
  error?: string;
  budget: { allocated: number; spent: number } | null;
  symbol: string;
  showNoBudget: boolean;
  onChange: (id: string) => void;
  onCreated: (c: ComboCategory) => void;
}) {
  const remaining = budget ? budget.allocated - budget.spent : null;
  const isOver = remaining !== null && remaining < 0;
  return (
    <div className="space-y-1">
      <Label>Category</Label>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={value === c.id}
              title={c.id === lastUsedId ? "Last used" : undefined}
              onClick={() => onChange(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                value === c.id ? "border-primary bg-primary/10 text-foreground font-medium"
                  : c.id === lastUsedId ? "border-primary/50 bg-muted/40 hover:bg-muted font-medium" : "border-border bg-muted/40 hover:bg-muted",
              )}
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      )}
      <CategoryCombobox categories={categories} value={value} type={type} invalid={invalid} onChange={onChange} onCreated={onCreated} />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {budget && remaining !== null && (
        <div className={cn("flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg", isOver ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300")}>
          {isOver ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
          {isOver
            ? `${symbol} ${(Math.abs(remaining) / 100).toLocaleString()} over budget this month`
            : `${symbol} ${(remaining / 100).toLocaleString()} remaining in budget this month`}
        </div>
      )}
      {showNoBudget && !budget && (
        <p className="text-xs text-muted-foreground px-1">No budget set for this category this month</p>
      )}
    </div>
  );
}
