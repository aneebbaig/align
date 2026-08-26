// ─── Cash-flow / repayment scheduler — pure projection engine ────────────────
//
// Deterministic. No dates, no DB, no I/O. Given obligation + income RULES it
// projects an N-month calendar of what is due, to whom, when — and flags months
// where obligations exceed the conservative income floor, by how much.
//
// See ./types.ts for the money/month-offset conventions.

import type {
  DueItem,
  IncomeRule,
  MonthIndex,
  MonthProjection,
  Money,
  ObligationRule,
  ProjectionInput,
  SlideSuggestion,
} from "./types";

const DEFAULT_HORIZON = 8;

/** Does a rule produce a due item in `month`? Returns the amount, else null. */
function dueInMonth(rule: ObligationRule, month: MonthIndex): Money | null {
  if (rule.kind === "LUMP_SUM") {
    return month === rule.startMonth ? rule.amount : null;
  }
  // FIXED_INSTALLMENT: startMonth..endMonth inclusive. If endMonth is missing,
  // treat as a single installment at startMonth.
  const end = rule.endMonth ?? rule.startMonth;
  return month >= rule.startMonth && month <= end ? rule.amount : null;
}

/** Sum income active in `month`, optionally restricted to the floor streams. */
function incomeInMonth(incomes: IncomeRule[], month: MonthIndex, floorOnly: boolean): Money {
  let total = 0;
  for (const inc of incomes) {
    if (floorOnly && !inc.countTowardFloor) continue;
    const start = inc.startMonth;
    const end = inc.endMonth ?? Infinity;
    if (month >= start && month <= end) total += inc.amount;
  }
  return total;
}

/**
 * Which flexible obligations could be slid to relieve a tight month, best first.
 * Ordering: lowest `priority` slides first; tie-break by largest amount (a bigger
 * slide relieves more). Only FLEXIBLE items with a non-zero slide window qualify.
 */
function buildSlideSuggestions(items: DueItem[], dueTotal: Money, floorIncome: Money): SlideSuggestion[] {
  const flexible = items
    .filter((i) => i.flexibility === "FLEXIBLE" && i.slideWindowMonths > 0)
    .sort((a, b) => a.priority - b.priority || b.amount - a.amount);

  return flexible.map((i) => {
    const dueTotalAfterSlide = dueTotal - i.amount;
    return {
      ruleId: i.ruleId,
      sourceId: i.sourceId,
      payee: i.payee,
      amount: i.amount,
      dueTotalAfterSlide,
      resolvesShortfall: dueTotalAfterSlide <= floorIncome,
    };
  });
}

/**
 * Project a rolling N-month cash-flow calendar.
 *
 * The affordability flag compares each month's obligations against the
 * conservative FLOOR income (streams marked `countTowardFloor`), not total
 * expected income — the point of the feature is to catch months that blow past
 * what you can actually rely on.
 */
export function projectCashflow(input: ProjectionInput): MonthProjection[] {
  const horizon = input.months ?? DEFAULT_HORIZON;
  const months: MonthProjection[] = [];

  for (let month = 1; month <= horizon; month++) {
    const items: DueItem[] = [];
    for (const rule of input.obligations) {
      const amount = dueInMonth(rule, month);
      if (amount == null) continue;
      items.push({
        ruleId: rule.id,
        sourceId: rule.sourceId,
        payee: rule.payee,
        category: rule.category,
        amount,
        flexibility: rule.flexibility,
        priority: rule.priority,
        slideWindowMonths: rule.slideWindowMonths,
      });
    }

    const dueTotal = items.reduce((s, i) => s + i.amount, 0);
    const floorIncome = incomeInMonth(input.incomes, month, true);
    const expectedIncome = incomeInMonth(input.incomes, month, false);
    const leftAfterObligations = floorIncome - dueTotal;
    const flagged = dueTotal > floorIncome;
    const shortfall = flagged ? dueTotal - floorIncome : 0;

    months.push({
      month,
      items,
      dueTotal,
      floorIncome,
      expectedIncome,
      leftAfterObligations,
      flagged,
      shortfall,
      slideSuggestions: flagged ? buildSlideSuggestions(items, dueTotal, floorIncome) : [],
    });
  }

  return months;
}
