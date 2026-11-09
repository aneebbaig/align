// Plan costs, shared by the web pages and the v1 routes so both apps agree.
//
// A plan is first drawn up on estimates alone. As the user asks around, they
// type in an actual cost (a market quote) on an item; that is a *known* cost,
// not a payment. Only bought (PAID) items count as paid, and the cost of a
// bought item is its actual cost - buying records one if none was entered.

export interface CostItem {
  estimatedCost: number;
  actualCost: number | null;
  status: string;
}

export const isBought = (i: Pick<CostItem, "status">) => i.status === "PAID";

/** What an item costs now: the real figure if known, else the estimate. */
export const bestCost = (i: CostItem) => i.actualCost ?? i.estimatedCost;

export function planTotals(items: CostItem[], fixedTotal?: number | null) {
  const estimated = items.reduce((s, i) => s + i.estimatedCost, 0);
  const paid = items.filter(isBought).reduce((s, i) => s + bestCost(i), 0);
  // Still to buy: everything not bought or skipped, at its real cost where one is known.
  const toBuy = items.filter((i) => !isBought(i) && i.status !== "SKIPPED").reduce((s, i) => s + bestCost(i), 0);
  const total = fixedTotal != null ? fixedTotal : estimated;
  return { estimated: total, paid, remaining: fixedTotal != null ? fixedTotal - paid : toBuy };
}
