// Wedding planner maths, in one place so every screen agrees.
//
// Cost and payment are separate things:
//   cost    - estimatedAmount (the plan), actualAmount (the real price once known)
//   payment - paidAmount (handed over so far; a deposit is a part payment)
// An expense is worth its actual cost where known, else its estimate.

export interface CostRow {
  eventId: string | null;
  category: string;
  estimatedAmount: number;
  actualAmount: number | null;
  paidAmount: number;
}

export interface QuoteLike { id: string; amount: number; isChosen: boolean }

export type PaymentStatus = "UNPAID" | "PART_PAID" | "PAID";

/** What an expense costs now: the real figure if known, else the estimate. */
export const costOf = (e: Pick<CostRow, "estimatedAmount" | "actualAmount">) => e.actualAmount ?? e.estimatedAmount;

export function paymentStatus(e: Pick<CostRow, "estimatedAmount" | "actualAmount" | "paidAmount">): PaymentStatus {
  const cost = costOf(e);
  if (e.paidAmount <= 0) return "UNPAID";
  return cost > 0 && e.paidAmount >= cost ? "PAID" : "PART_PAID";
}

/** Still to hand over (never negative). */
export const balanceOf = (e: Pick<CostRow, "estimatedAmount" | "actualAmount" | "paidAmount">) => Math.max(0, costOf(e) - e.paidAmount);

/** Actual minus estimate: positive = dearer than planned. Null until an actual exists. */
export function varianceOf(e: Pick<CostRow, "estimatedAmount" | "actualAmount">): number | null {
  return e.actualAmount === null || e.estimatedAmount <= 0 ? null : e.actualAmount - e.estimatedAmount;
}

export interface Totals {
  count: number;
  /** Sum of estimates - the plan as first imagined. */
  estimated: number;
  /** Sum of costOf - actual where known, else estimate. The number to compare with the budget. */
  projected: number;
  /** Sum of the actual costs entered so far. */
  actual: number;
  /** How many expenses have a real price. */
  priced: number;
  paid: number;
  outstanding: number;
}

export function sumTotals(rows: CostRow[]): Totals {
  const t: Totals = { count: rows.length, estimated: 0, projected: 0, actual: 0, priced: 0, paid: 0, outstanding: 0 };
  for (const e of rows) {
    t.estimated += e.estimatedAmount;
    t.projected += costOf(e);
    t.paid += e.paidAmount;
    t.outstanding += balanceOf(e);
    if (e.actualAmount !== null) { t.actual += e.actualAmount; t.priced += 1; }
  }
  return t;
}

/** Totals for each key (event id or category), plus the overall total. */
export function groupTotals(rows: CostRow[], key: (e: CostRow) => string): Map<string, Totals> {
  const groups = new Map<string, CostRow[]>();
  for (const e of rows) {
    const k = key(e);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return new Map([...groups].map(([k, v]) => [k, sumTotals(v)]));
}

/** The cheapest quote - null with fewer than two quotes (nothing to compare), or on a tie for lowest. */
export function cheapestQuote<Q extends QuoteLike>(quotes: Q[]): Q | null {
  if (quotes.length < 2) return null;
  const min = Math.min(...quotes.map((q) => q.amount));
  const lowest = quotes.filter((q) => q.amount === min);
  return lowest.length === 1 ? lowest[0] : null;
}

/** Gap between the dearest and cheapest quote - what shopping around is worth. */
export function quoteSpread(quotes: QuoteLike[]): number {
  if (quotes.length < 2) return 0;
  const amounts = quotes.map((q) => q.amount);
  return Math.max(...amounts) - Math.min(...amounts);
}
