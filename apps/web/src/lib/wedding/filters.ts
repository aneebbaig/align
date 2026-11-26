// Search and status filtering for wedding expense lists, shared by the overview and event pages.

import { paymentStatus } from "./totals";

export type StatusFilter = "ALL" | "TO_PAY" | "PART_PAID" | "PAID" | "NEEDS_PRICE" | "QUOTES";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "TO_PAY", label: "To pay" },
  { value: "PART_PAID", label: "Part paid" },
  { value: "PAID", label: "Paid" },
  { value: "NEEDS_PRICE", label: "Needs price" },
  { value: "QUOTES", label: "Quotes to choose" },
];

export interface FilterRow {
  name: string;
  notes: string | null;
  vendorName: string | null;
  estimatedAmount: number;
  actualAmount: number | null;
  paidAmount: number;
  quotes: { isChosen: boolean; vendorName?: string }[];
}

export function matchesStatus(e: FilterRow, f: StatusFilter): boolean {
  switch (f) {
    case "ALL": return true;
    case "TO_PAY": return paymentStatus(e) !== "PAID";
    case "PART_PAID": return paymentStatus(e) === "PART_PAID";
    case "PAID": return paymentStatus(e) === "PAID";
    case "NEEDS_PRICE": return e.actualAmount === null;
    case "QUOTES": return e.quotes.length >= 2 && !e.quotes.some((q) => q.isChosen);
  }
}

/** Case-insensitive match on name, vendor (including quoting vendors) and notes. */
export function matchesSearch(e: FilterRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [e.name, e.vendorName, e.notes, ...e.quotes.map((x) => x.vendorName)].some((v) => v?.toLowerCase().includes(q));
}

export function statusCounts(rows: FilterRow[]): Record<StatusFilter, number> {
  const counts = {} as Record<StatusFilter, number>;
  for (const f of STATUS_FILTERS) counts[f.value] = rows.filter((r) => matchesStatus(r, f.value)).length;
  return counts;
}
