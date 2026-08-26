import { describe, expect, it } from "vitest";
import { buildProjectionInput, daysUntilEndOfMonth, listUpcomingDue, monthOffset, type AdapterInput } from "./adapter";
import { projectCashflow } from "./scheduler";

// Fixed anchor so tests never depend on the real clock.
const ANCHOR = new Date(Date.UTC(2026, 0, 15)); // 2026-01-15 → month 1 = Jan 2026
const utc = (y: number, m: number, d = 1) => new Date(Date.UTC(y, m - 1, d));

describe("monthOffset", () => {
  it("same month = 1", () => {
    expect(monthOffset(utc(2026, 1, 28), ANCHOR)).toBe(1);
  });
  it("next month = 2, +3 months = 4", () => {
    expect(monthOffset(utc(2026, 2), ANCHOR)).toBe(2);
    expect(monthOffset(utc(2026, 4), ANCHOR)).toBe(4);
  });
  it("crosses a year boundary", () => {
    expect(monthOffset(utc(2027, 1), ANCHOR)).toBe(13);
  });
  it("past date is negative/zero (clamped elsewhere)", () => {
    expect(monthOffset(utc(2025, 12), ANCHOR)).toBe(0);
  });
});

describe("buildProjectionInput → reproduces the golden scenario from real dates", () => {
  // Same numbers as the spec, expressed as calendar dates off the Jan-2026 anchor.
  const data: AdapterInput = {
    recurringIncomes: [
      { id: "sal", label: "Salary", kind: "SALARY", amount: 155_000, variable: false,
        countsTowardFloor: false, startDate: utc(2025, 6), endDate: null, active: true },
      { id: "fl", label: "Freelance", kind: "FREELANCE", amount: 111_000, variable: true,
        countsTowardFloor: true, startDate: utc(2025, 6), endDate: null, active: true },
    ],
    loanSchedules: [
      { id: "A1", loanId: "loanA", payee: "Loan A", kind: "LUMP_SUM", amount: 20_000,
        startDate: utc(2026, 1), endDate: null, flexibility: "FIXED", priority: 0,
        slideWindowMonths: 0, interestRate: null },
      { id: "A2", loanId: "loanA", payee: "Loan A", kind: "LUMP_SUM", amount: 60_000,
        startDate: utc(2026, 4), endDate: null, flexibility: "FIXED", priority: 0,
        slideWindowMonths: 0, interestRate: null },
      { id: "B", loanId: "loanB", payee: "Loan B", kind: "FIXED_INSTALLMENT", amount: 83_000,
        startDate: utc(2026, 3), endDate: utc(2026, 8), flexibility: "FLEXIBLE", priority: 0,
        slideWindowMonths: 1, interestRate: null },
    ],
    plannedExpenses: [
      { id: "tui", name: "Sister's tuition", amount: 120_000, dueDate: utc(2026, 2),
        flexibility: "FIXED", priority: 0, slideWindowMonths: 0, status: "PLANNED" },
    ],
  };

  it("yields the exact spec due-totals and flags", () => {
    const input = buildProjectionInput(data, ANCHOR, 8);
    const proj = projectCashflow(input);
    expect(proj.map((m) => m.dueTotal)).toEqual([20_000, 120_000, 83_000, 143_000, 83_000, 83_000, 83_000, 83_000]);
    expect(proj.filter((m) => m.flagged).map((m) => m.month)).toEqual([2, 4]);
    expect(proj[1].shortfall).toBe(9_000);
    expect(proj[3].shortfall).toBe(32_000);
    expect(proj[3].slideSuggestions[0].sourceId).toBe("loanB");
  });
});

describe("buildProjectionInput → boundaries", () => {
  it("drops obligations that start past the horizon, clamps overdue into month 1", () => {
    const data: AdapterInput = {
      recurringIncomes: [],
      loanSchedules: [],
      plannedExpenses: [
        { id: "overdue", name: "Overdue", amount: 1, dueDate: utc(2025, 11), flexibility: "FIXED",
          priority: 0, slideWindowMonths: 0, status: "PLANNED" },
        { id: "future", name: "Way out", amount: 1, dueDate: utc(2027, 6), flexibility: "FIXED",
          priority: 0, slideWindowMonths: 0, status: "PLANNED" },
      ],
    };
    const input = buildProjectionInput(data, ANCHOR, 8);
    expect(input.obligations).toHaveLength(1);
    expect(input.obligations[0].startMonth).toBe(1); // overdue clamped to now
  });

  it("excludes non-PLANNED planned expenses and inactive incomes", () => {
    const data: AdapterInput = {
      recurringIncomes: [
        { id: "old", label: "Old job", kind: "SALARY", amount: 9, variable: false,
          countsTowardFloor: true, startDate: utc(2025, 1), endDate: null, active: false },
      ],
      loanSchedules: [],
      plannedExpenses: [
        { id: "paid", name: "Paid", amount: 9, dueDate: utc(2026, 2), flexibility: "FIXED",
          priority: 0, slideWindowMonths: 0, status: "PAID" },
      ],
    };
    const input = buildProjectionInput(data, ANCHOR, 8);
    expect(input.obligations).toHaveLength(0);
    expect(input.incomes).toHaveLength(0);
  });

  it("truncates a FIXED_INSTALLMENT end to the horizon", () => {
    const data: AdapterInput = {
      recurringIncomes: [],
      loanSchedules: [
        { id: "long", loanId: "l", payee: "Long", kind: "FIXED_INSTALLMENT", amount: 100,
          startDate: utc(2026, 1), endDate: utc(2026, 12), flexibility: "FIXED", priority: 0,
          slideWindowMonths: 0, interestRate: null },
      ],
      plannedExpenses: [],
    };
    const input = buildProjectionInput(data, ANCHOR, 8);
    expect(input.obligations[0].endMonth).toBe(8); // Dec is month 12, truncated
  });
});

describe("listUpcomingDue — lead-time alerts", () => {
  it("includes a LUMP_SUM due within the window, excludes one outside it", () => {
    const data: AdapterInput = {
      recurringIncomes: [],
      loanSchedules: [
        { id: "soon", loanId: "loanSoon", payee: "Soon", kind: "LUMP_SUM", amount: 5_000,
          startDate: utc(2026, 1, 18), endDate: null, flexibility: "FIXED", priority: 0,
          slideWindowMonths: 0, interestRate: null },
        { id: "far", loanId: "loanFar", payee: "Far", kind: "LUMP_SUM", amount: 5_000,
          startDate: utc(2026, 3, 1), endDate: null, flexibility: "FIXED", priority: 0,
          slideWindowMonths: 0, interestRate: null },
      ],
      plannedExpenses: [],
    };
    const due = listUpcomingDue(data, ANCHOR, 7); // anchor = Jan 15
    expect(due).toHaveLength(1);
    expect(due[0].sourceId).toBe("loanSoon");
    expect(due[0].daysUntil).toBe(3);
  });

  it("excludes a due date already in the past", () => {
    const data: AdapterInput = {
      recurringIncomes: [],
      loanSchedules: [],
      plannedExpenses: [
        { id: "past", name: "Past due", amount: 1, dueDate: utc(2026, 1, 1), flexibility: "FIXED",
          priority: 0, slideWindowMonths: 0, status: "PLANNED" },
      ],
    };
    expect(listUpcomingDue(data, ANCHOR, 30)).toHaveLength(0);
  });

  it("finds the next monthly occurrence of a FIXED_INSTALLMENT within the window", () => {
    const data: AdapterInput = {
      recurringIncomes: [],
      loanSchedules: [
        { id: "inst", loanId: "loanB", payee: "Loan B", kind: "FIXED_INSTALLMENT", amount: 83_000,
          startDate: utc(2025, 12, 20), endDate: utc(2026, 8, 20), flexibility: "FLEXIBLE",
          priority: 0, slideWindowMonths: 1, interestRate: null },
      ],
      plannedExpenses: [],
    };
    // anchor Jan 15 → next occurrence on the 20th is Jan 20, 5 days out
    const due = listUpcomingDue(data, ANCHOR, 7);
    expect(due).toHaveLength(1);
    expect(due[0].daysUntil).toBe(5);
    expect(due[0].dueDate.getUTCMonth()).toBe(0); // January
  });

  it("sorts multiple hits soonest first", () => {
    const data: AdapterInput = {
      recurringIncomes: [],
      loanSchedules: [],
      plannedExpenses: [
        { id: "later", name: "Later", amount: 1, dueDate: utc(2026, 1, 20), flexibility: "FIXED",
          priority: 0, slideWindowMonths: 0, status: "PLANNED" },
        { id: "sooner", name: "Sooner", amount: 1, dueDate: utc(2026, 1, 16), flexibility: "FIXED",
          priority: 0, slideWindowMonths: 0, status: "PLANNED" },
      ],
    };
    const due = listUpcomingDue(data, ANCHOR, 30);
    expect(due.map((d) => d.sourceId)).toEqual(["sooner", "later"]);
  });
});

describe("daysUntilEndOfMonth", () => {
  it("counts remaining days in a 31-day month, ignoring time-of-day", () => {
    // Jan 2026 has 31 days; anchor with a non-midnight time must not shift the count.
    expect(daysUntilEndOfMonth(new Date(Date.UTC(2026, 0, 15, 23, 59)))).toBe(16);
  });

  it("is 0 on the last day of the month", () => {
    expect(daysUntilEndOfMonth(utc(2026, 1, 31))).toBe(0);
  });

  it("handles February in a leap year", () => {
    expect(daysUntilEndOfMonth(utc(2028, 2, 1))).toBe(28); // 2028 is a leap year, Feb has 29 days
  });
});
