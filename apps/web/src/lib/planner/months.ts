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
