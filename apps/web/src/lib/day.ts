// Calendar days in the household's timezone, independent of the server's
// (Vercel runs in UTC; the app's users are in Pakistan). Set APP_TIMEZONE to
// override.
export const APP_TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Karachi";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar day `date` falls on in `timeZone`, as a day count - so
 * subtracting two gives whole days. */
export function dayNumber(date: Date, timeZone: string = APP_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY_MS;
}

/** Day number of the last day of a calendar month (month is 1-12). */
export function lastDayOfMonth(month: number, year: number): number {
  return Date.UTC(year, month, 0) / DAY_MS;
}
