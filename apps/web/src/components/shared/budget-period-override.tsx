"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getMonthName } from "@/lib/utils";

/** Derives the {month, year} to file under from an entry's own yyyy-MM-dd date string. */
export function monthYearFromDateStr(date: string): { month: number; year: number } {
  const [year, month] = date.split("-").map(Number);
  return { month, year };
}

/**
 * Shared control for filing a transaction under the budget month its own date
 * falls in, instead of the open period. Default: off -> the open period is
 * used. Reused by the expense form, loan-creation dialog, and loan-repayment
 * dialog so the override exists in exactly one place.
 */
export function BudgetPeriodOverride({
  date,
  checked,
  onChange,
  affectsFunding = false,
}: {
  date: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** When true (expense/loan-payment forms), adds a note that the funding
   * figures shown elsewhere in the form follow this same target period. */
  affectsFunding?: boolean;
}) {
  const { month, year } = date ? monthYearFromDateStr(date) : { month: 0, year: 0 };

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id="periodOverride"
        checked={checked}
        onCheckedChange={(c) => onChange(!!c)}
        className="mt-0.5"
      />
      <Label htmlFor="periodOverride" className="cursor-pointer text-sm font-normal leading-snug">
        {month ? (
          <>File under {getMonthName(month)} {year}&apos;s budget</>
        ) : (
          "File under this date's budget month"
        )}
        <span className="block text-xs text-muted-foreground">
          Otherwise files under the current open period
          {affectsFunding && month ? ` - income figures below reflect ${getMonthName(month)} ${year}` : ""}
        </span>
      </Label>
    </div>
  );
}
