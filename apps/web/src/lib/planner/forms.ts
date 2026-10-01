// Initial values for the planner's web dialogs, built from what's stored. The
// dialogs are remounted each time they open, so these are always current.

export interface LineFormValues {
  name: string;
  direction: string; // "IN" | "OUT"
  currency: string; // "PKR" | "USD"
}

export function lineForm(line: { name: string; direction: string; currency: string } | null): LineFormValues {
  return line ? { name: line.name, direction: line.direction, currency: line.currency } : { name: "", direction: "IN", currency: "PKR" };
}

export interface SettingsFormValues {
  start: string; // "yyyy-MM" for <input type="month">
  months: string;
  startingCash: string; // rupees
  usdRate: string;
}

export function settingsForm(s: { startMonth: number; startYear: number; months: number; startingCashPaisas: number; usdRate: number }): SettingsFormValues {
  return {
    start: `${s.startYear}-${String(s.startMonth).padStart(2, "0")}`,
    months: String(s.months),
    startingCash: String(s.startingCashPaisas / 100),
    usdRate: String(s.usdRate),
  };
}
