// Month keys: one integer per calendar month, year*12 + (month-1), so month
// ranges and "latest step at or before" are plain integer comparisons.

export function toMonthKey(month: number, year: number): number {
  return year * 12 + (month - 1);
}

export function monthKeyToParts(key: number): { month: number; year: number } {
  return { year: Math.floor(key / 12), month: (key % 12) + 1 };
}

export function currentMonthKey(now: Date = new Date()): number {
  return toMonthKey(now.getMonth() + 1, now.getFullYear());
}

export const MIN_MONTHS = 1;
export const MAX_MONTHS = 120;

export interface MonthRange { startMonth: number; startYear: number; months: number }

/** The range with one more month at the start. Null at the maximum length. */
export function addMonthBefore(r: MonthRange): MonthRange | null {
  if (r.months >= MAX_MONTHS) return null;
  const p = monthKeyToParts(toMonthKey(r.startMonth, r.startYear) - 1);
  return { startMonth: p.month, startYear: p.year, months: r.months + 1 };
}

/** The range with one more month at the end. Null at the maximum length. */
export function addMonthAfter(r: MonthRange): MonthRange | null {
  return r.months >= MAX_MONTHS ? null : { ...r, months: r.months + 1 };
}

/** The range without its first month. Null when only one month is left. */
export function removeFirstMonth(r: MonthRange): MonthRange | null {
  if (r.months <= MIN_MONTHS) return null;
  const p = monthKeyToParts(toMonthKey(r.startMonth, r.startYear) + 1);
  return { startMonth: p.month, startYear: p.year, months: r.months - 1 };
}

/** The range without its last month. Null when only one month is left. */
export function removeLastMonth(r: MonthRange): MonthRange | null {
  return r.months <= MIN_MONTHS ? null : { ...r, months: r.months - 1 };
}
