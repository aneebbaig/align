// ─── Cash-flow adapter ───────────────────────────────────────────────────────
// The ONLY place that knows about dates. Maps persisted rows (LoanSchedule,
// RecurringIncome, PlannedExpense) into the pure scheduler's month-offset input,
// anchored to a supplied "today". Kept pure (anchor is injected, never read from
// the clock here) so it is fully deterministic in tests. The server action
// passes `new Date()`.
//
// Bucketing granularity is the calendar MONTH, in UTC (Prisma returns UTC Dates;
// month buckets are coarse enough that intra-day/timezone drift is irrelevant).
// month 1 = the anchor's month. Anything due in or before the anchor month
// buckets into month 1 (overdue/now still shows up in the first column).

import type { IncomeRule, Money, ObligationCategory, ObligationRule, ProjectionInput } from "./types";

/** 1-based calendar-month offset of `date` from `anchor` (both UTC). */
export function monthOffset(date: Date, anchor: Date): number {
  return (
    (date.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (date.getUTCMonth() - anchor.getUTCMonth()) +
    1
  );
}

/** Clamp an offset into [1, horizon]; returns null if it falls past the horizon. */
function clampStart(offset: number, horizon: number): number | null {
  if (offset > horizon) return null; // starts after the window — ignore
  return Math.max(1, offset); // overdue/now → month 1
}

// Row shapes: structural subsets of the Prisma models, so callers can pass
// `select`-ed rows without dragging in unrelated relations.
export interface LoanScheduleRow {
  id: string;
  loanId: string;
  kind: string; // "LUMP_SUM" | "FIXED_INSTALLMENT"
  amount: number;
  startDate: Date;
  endDate: Date | null;
  flexibility: string; // "FIXED" | "FLEXIBLE"
  priority: number;
  slideWindowMonths: number;
  interestRate: number | null;
  payee: string; // resolved from loan.personName by the caller
}

export interface RecurringIncomeRow {
  id: string;
  label: string;
  kind: string;
  amount: number;
  variable: boolean;
  countsTowardFloor: boolean;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
}

export interface PlannedExpenseRow {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  flexibility: string;
  priority: number;
  slideWindowMonths: number;
  status: string; // only "PLANNED" contributes
}

export interface AdapterInput {
  loanSchedules: LoanScheduleRow[];
  recurringIncomes: RecurringIncomeRow[];
  plannedExpenses: PlannedExpenseRow[];
}

function flex(v: string): "FIXED" | "FLEXIBLE" {
  return v === "FLEXIBLE" ? "FLEXIBLE" : "FIXED";
}

/**
 * Build the scheduler's ProjectionInput from persisted rows.
 * @param anchor "today" — the projection's month 1.
 * @param horizon rolling window length in months.
 */
export function buildProjectionInput(
  data: AdapterInput,
  anchor: Date,
  horizon: number,
): ProjectionInput {
  const obligations: ObligationRule[] = [];

  for (const s of data.loanSchedules) {
    const startMonth = clampStart(monthOffset(s.startDate, anchor), horizon);
    if (startMonth == null) continue;
    let endMonth: number | undefined;
    if (s.kind === "FIXED_INSTALLMENT" && s.endDate) {
      const rawEnd = monthOffset(s.endDate, anchor);
      if (rawEnd < startMonth) continue; // window entirely in the past
      endMonth = Math.min(rawEnd, horizon);
    }
    obligations.push({
      id: s.id,
      sourceId: s.loanId,
      payee: s.payee,
      category: "LOAN",
      kind: s.kind === "FIXED_INSTALLMENT" ? "FIXED_INSTALLMENT" : "LUMP_SUM",
      amount: s.amount,
      startMonth,
      endMonth,
      flexibility: flex(s.flexibility),
      priority: s.priority,
      slideWindowMonths: s.slideWindowMonths,
      interestRate: s.interestRate ?? undefined,
    });
  }

  for (const p of data.plannedExpenses) {
    if (p.status !== "PLANNED") continue;
    const startMonth = clampStart(monthOffset(p.dueDate, anchor), horizon);
    if (startMonth == null) continue;
    obligations.push({
      id: p.id,
      sourceId: p.id,
      payee: p.name,
      category: "EXPENSE",
      kind: "LUMP_SUM",
      amount: p.amount,
      startMonth,
      flexibility: flex(p.flexibility),
      priority: p.priority,
      slideWindowMonths: p.slideWindowMonths,
    });
  }

  const incomes: IncomeRule[] = [];
  for (const inc of data.recurringIncomes) {
    if (!inc.active) continue;
    // Income pays every month it's active. An income that started in the past is
    // active from month 1; one starting mid-window starts at its offset.
    const startMonth = clampStart(monthOffset(inc.startDate, anchor), horizon);
    if (startMonth == null) continue;
    let endMonth: number | undefined;
    if (inc.endDate) {
      const rawEnd = monthOffset(inc.endDate, anchor);
      if (rawEnd < startMonth) continue; // ended before it starts in-window
      endMonth = Math.min(rawEnd, horizon);
    }
    incomes.push({
      id: inc.id,
      label: inc.label,
      kind: inc.kind === "SALARY" ? "SALARY" : inc.kind === "FREELANCE" ? "FREELANCE" : "OTHER",
      amount: inc.amount,
      startMonth,
      endMonth,
      variable: inc.variable,
      countTowardFloor: inc.countsTowardFloor,
    });
  }

  return { obligations, incomes, months: horizon };
}

/** A single concrete future due-date, for lead-time alerts (Checkpoint 3). */
export interface UpcomingDue {
  sourceId: string;
  payee: string;
  category: ObligationCategory;
  amount: Money;
  dueDate: Date;
  daysUntil: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/** Date-only (UTC) days remaining until the last day of anchor's calendar month, ignoring time-of-day. */
export function daysUntilEndOfMonth(anchor: Date): number {
  const endOfMonth = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0);
  const today = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
  return Math.round((endOfMonth - today) / MS_PER_DAY);
}

/**
 * Concrete (not month-bucketed) due dates within `withinDays` of `anchor`,
 * sorted soonest first. This is the exact-date companion to
 * `buildProjectionInput` — the monthly projection answers "which months are
 * tight", this answers "what fires in the next N days" for lead-time warnings.
 * A FIXED_INSTALLMENT loan schedule expands to one occurrence per month in its
 * window; only the first occurrence still within `withinDays` is returned per
 * call (callers re-run this daily/on load, so later occurrences surface later).
 */
export function listUpcomingDue(data: AdapterInput, anchor: Date, withinDays: number): UpcomingDue[] {
  const results: UpcomingDue[] = [];

  const consider = (sourceId: string, payee: string, category: ObligationCategory, amount: Money, dueDate: Date) => {
    const daysUntil = daysBetween(dueDate, anchor);
    if (daysUntil >= 0 && daysUntil <= withinDays) {
      results.push({ sourceId, payee, category, amount, dueDate, daysUntil });
    }
  };

  for (const s of data.loanSchedules) {
    if (s.kind === "LUMP_SUM") {
      consider(s.loanId, s.payee, "LOAN", s.amount, s.startDate);
      continue;
    }
    // FIXED_INSTALLMENT: find the next occurrence on/after `anchor`, same
    // day-of-month as startDate, within [startDate, endDate].
    const end = s.endDate ?? s.startDate;
    const occurrence = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), s.startDate.getUTCDate()));
    if (occurrence < anchor) occurrence.setUTCMonth(occurrence.getUTCMonth() + 1);
    if (occurrence >= s.startDate && occurrence <= end) {
      consider(s.loanId, s.payee, "LOAN", s.amount, occurrence);
    }
  }

  for (const p of data.plannedExpenses) {
    if (p.status !== "PLANNED") continue;
    consider(p.id, p.name, "EXPENSE", p.amount, p.dueDate);
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}
