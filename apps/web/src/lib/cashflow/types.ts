// ─── Cash-flow / repayment planner — domain types ───────────────────────────
//
// The scheduler is deliberately PURE and unit-agnostic:
//   • All money is an integer in a single smallest unit (paisas in the DB; the
//     scheduler never divides currencies, it only adds/compares, so the unit is
//     opaque to it). Tests express amounts in whole rupees for readability — the
//     scheduler doesn't care.
//   • All timing is expressed as a 1-based MONTH OFFSET from the projection
//     anchor. month 1 = the anchor month (the real current month), month N =
//     the horizon. A separate adapter maps Prisma `DateTime` rows → these
//     offsets using the real system date, so this file has zero date logic and
//     is trivially testable.
//
// This separation is what keeps the planner scalable: new obligation sources
// (loans, tuition, subscriptions, tax) all reduce to `ObligationRule`s, and new
// income shapes reduce to `IncomeRule`s. The projection math never grows.

export type Money = number; // integer, smallest unit
export type MonthIndex = number; // 1-based offset from the projection anchor

export type Flexibility = "FIXED" | "FLEXIBLE";
export type ScheduleKind = "LUMP_SUM" | "FIXED_INSTALLMENT";
export type ObligationCategory = "LOAN" | "EXPENSE";

/**
 * One scheduled outflow rule. A single real-world loan can produce MULTIPLE
 * rules (e.g. "20k now, remaining 60k in month 4" = two LUMP_SUM rules sharing
 * one `sourceId`). A fixed-installment loan is one FIXED_INSTALLMENT rule
 * spanning startMonth..endMonth inclusive.
 */
export interface ObligationRule {
  id: string;
  sourceId: string; // the loan / planned-expense this derives from
  payee: string;
  category: ObligationCategory;
  kind: ScheduleKind;
  /** LUMP_SUM: the whole amount at startMonth. FIXED_INSTALLMENT: per-month amount. */
  amount: Money;
  startMonth: MonthIndex;
  /** FIXED_INSTALLMENT only, inclusive. Ignored for LUMP_SUM. */
  endMonth?: MonthIndex;
  flexibility: Flexibility;
  /** Lower slides first when a month is tight. Default 0. */
  priority: number;
  /** How many months this can move (Loan B is ±1). 0 = immovable. */
  slideWindowMonths: number;
  /** Annual %, declining-balance. 0/undefined = interest-free (v1 golden path). */
  interestRate?: number;
}

/**
 * A recurring income stream.
 *  • Salary: fixed `amount`, `variable=false`.
 *  • Freelance: `amount` is the guaranteed FLOOR, `variable=true`.
 * `countTowardFloor` marks whether this stream is part of the conservative
 * "money I can actually rely on to service obligations" baseline. Salary that is
 * already eaten by fixed living costs is intentionally left out of that floor —
 * that is the whole "payday gets eaten" blind-spot this feature targets.
 */
export interface IncomeRule {
  id: string;
  label: string;
  kind: "SALARY" | "FREELANCE" | "OTHER";
  amount: Money;
  startMonth: MonthIndex;
  endMonth?: MonthIndex;
  variable: boolean;
  countTowardFloor: boolean;
}

/** One obligation actually falling due in a given projected month. */
export interface DueItem {
  ruleId: string;
  sourceId: string;
  payee: string;
  category: ObligationCategory;
  amount: Money;
  flexibility: Flexibility;
  priority: number;
  slideWindowMonths: number;
}

/** A suggestion to relieve a tight month by sliding a flexible obligation. */
export interface SlideSuggestion {
  ruleId: string;
  sourceId: string;
  payee: string;
  amount: Money;
  /** dueTotal after removing this item — for showing "would drop to X (within floor)". */
  dueTotalAfterSlide: Money;
  resolvesShortfall: boolean;
}

export interface MonthProjection {
  month: MonthIndex;
  items: DueItem[];
  dueTotal: Money;
  /** Sum of income streams flagged countTowardFloor active this month. */
  floorIncome: Money;
  /** Sum of ALL income streams active this month (salary + floor + other). */
  expectedIncome: Money;
  /** floorIncome − dueTotal. Negative = over the floor. */
  leftAfterObligations: Money;
  /** dueTotal > floorIncome. */
  flagged: boolean;
  /** How much dueTotal exceeds floorIncome (0 when not flagged). */
  shortfall: Money;
  /** For flagged months: flexible obligations to slide, best first. */
  slideSuggestions: SlideSuggestion[];
}

export interface ProjectionInput {
  obligations: ObligationRule[];
  incomes: IncomeRule[];
  /** Horizon in months. Default 8. */
  months?: number;
}
