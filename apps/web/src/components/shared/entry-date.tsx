"use client";

import { useState } from "react";
import { BudgetPeriodOverride } from "@/components/shared/budget-period-override";
import { DayStrip } from "@/components/shared/day-strip";
import { LAST_ENTRY_DATE_KEY, isOtherPeriod, readLastUsed } from "@/lib/day-strip";

/** A recent date from the last entry saved (within 30 min), read once - offered as a chip, never preselected. */
export function useLastUsedDate(): string | null {
  const [last] = useState<string | null>(() =>
    typeof window !== "undefined" ? readLastUsed(window.localStorage.getItem(LAST_ENTRY_DATE_KEY), new Date()) : null,
  );
  return last;
}

/**
 * The standard date control for money entries: the day strip, plus a compact
 * "Count it in {Month}'s budget" checkbox that only shows when the chosen date
 * falls outside the home budget period (or the box is already ticked).
 */
export function EntryDate({
  date, onDateChange, homePeriod, checked, onCheckedChange, affectsFunding, lastUsed,
}: {
  date: string;
  onDateChange: (date: string) => void;
  /** The period an entry lands in by default. Omit for no budget checkbox. */
  homePeriod?: { month: number; year: number } | null;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  affectsFunding?: boolean;
  lastUsed?: string | null;
}) {
  const show = !!onCheckedChange && (isOtherPeriod(date, homePeriod) || !!checked);
  return (
    <div className="space-y-2">
      <DayStrip value={date} onChange={onDateChange} lastUsed={lastUsed} />
      {show && (
        <BudgetPeriodOverride compact date={date} checked={!!checked} onChange={onCheckedChange!} affectsFunding={affectsFunding} />
      )}
    </div>
  );
}
