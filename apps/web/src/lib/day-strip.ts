import { addDays, differenceInCalendarDays, format } from "date-fns";

/** Dates are local calendar days, written yyyy-MM-dd (same as the entry form's date field). */
export const DATE_STR = "yyyy-MM-dd";
export const LAST_ENTRY_DATE_KEY = "align:lastEntryDate";
const LAST_USED_WINDOW_MS = 30 * 60 * 1000;
/** Today, Yesterday and 11 more days: 13 days back from today. */
export const STRIP_DAYS = 14;

export function toDateStr(d: Date): string { return format(d, DATE_STR); }

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export interface DayChip { value: string; label: string; kind: "last" | "picked" | "day" }

/** How many days ago a yyyy-MM-dd date is (negative = future). */
function daysAgo(value: string, today: Date): number {
  return differenceInCalendarDays(today, parseDateStr(value));
}

export function isInStrip(value: string, today: Date): boolean {
  const n = daysAgo(value, today);
  return n >= 0 && n < STRIP_DAYS;
}

/**
 * Chips newest-first: [picked date if outside the strip] [Last: d MMM] Today, Yesterday,
 * "EEE d" for days 2-13. "Last" is skipped when it is today or already a chip in the strip.
 */
export function buildDayChips(opts: { today: Date; selected: string; lastUsed?: string | null }): DayChip[] {
  const { today, selected, lastUsed } = opts;
  const chips: DayChip[] = [];
  if (selected && !isInStrip(selected, today)) {
    chips.push({ value: selected, label: format(parseDateStr(selected), "d MMM"), kind: "picked" });
  }
  if (lastUsed && lastUsed !== selected && !isInStrip(lastUsed, today)) {
    chips.push({ value: lastUsed, label: `Last: ${format(parseDateStr(lastUsed), "d MMM")}`, kind: "last" });
  }
  for (let i = 0; i < STRIP_DAYS; i++) {
    const d = addDays(today, -i);
    chips.push({ value: toDateStr(d), label: i === 0 ? "Today" : i === 1 ? "Yesterday" : format(d, "EEE d"), kind: "day" });
  }
  return chips;
}

/** One day older (-1) or newer (+1), never later than today. */
export function stepDay(value: string, delta: -1 | 1, today: Date): string {
  const next = addDays(parseDateStr(value), delta);
  return toDateStr(next > today ? today : next);
}

/** The remembered date if it was saved within 30 minutes and is not today. */
export function readLastUsed(raw: string | null, now: Date): string | null {
  if (!raw) return null;
  try {
    const { date, savedAt } = JSON.parse(raw) as { date?: string; savedAt?: string };
    if (!date || !savedAt || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const age = now.getTime() - new Date(savedAt).getTime();
    if (!(age >= 0 && age <= LAST_USED_WINDOW_MS)) return null;
    return date === toDateStr(now) ? null : date;
  } catch {
    return null;
  }
}

export function rememberEntryDate(date: string, now: Date, storage: Pick<Storage, "setItem"> | undefined = typeof window !== "undefined" ? window.localStorage : undefined) {
  try { storage?.setItem(LAST_ENTRY_DATE_KEY, JSON.stringify({ date, savedAt: now.toISOString() })); } catch { /* storage unavailable */ }
}

/** True when a yyyy-MM-dd date falls in a different budget month than the home period. */
export function isOtherPeriod(date: string, home: { month: number; year: number } | undefined | null): boolean {
  if (!date || !home) return false;
  const [year, month] = date.split("-").map(Number);
  return month !== home.month || year !== home.year;
}
