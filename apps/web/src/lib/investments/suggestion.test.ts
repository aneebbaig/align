import { describe, expect, it } from "vitest";
import { computeInvestmentSuggestion, loansDueThisMonth } from "./suggestion";

describe("computeInvestmentSuggestion", () => {
  it("splits the surplus by category percentage", () => {
    const result = computeInvestmentSuggestion({
      monthlyIncome: 155_000,
      obligationsDue: 20_000,
      bufferTarget: 100_000,
      bufferCurrent: 100_000, // fully funded — no unmet buffer
      categories: [
        { id: "a", name: "Equity", investmentType: "MUTUAL_FUND", percentage: 40, actualAmount: 0 },
        { id: "b", name: "Gold", investmentType: "GOLD", percentage: 60, actualAmount: 0 },
      ],
    });
    expect(result.bufferUnmet).toBe(0);
    expect(result.suggestedTotal).toBe(135_000); // 155k - 20k
    expect(result.categories.map((c) => c.plannedAmount)).toEqual([54_000, 81_000]);
  });

  it("deducts the unmet buffer before splitting", () => {
    const result = computeInvestmentSuggestion({
      monthlyIncome: 200_000,
      obligationsDue: 50_000,
      bufferTarget: 300_000,
      bufferCurrent: 100_000, // 200k short
      categories: [],
    });
    expect(result.bufferUnmet).toBe(200_000);
    expect(result.suggestedTotal).toBe(0); // 200k income - 50k due - 200k unmet = -50k, floored at 0
  });

  it("never goes negative even when obligations exceed income", () => {
    const result = computeInvestmentSuggestion({
      monthlyIncome: 50_000,
      obligationsDue: 80_000,
      bufferTarget: 0,
      bufferCurrent: 0,
      categories: [{ id: "a", name: "X", investmentType: null, percentage: 100, actualAmount: 0 }],
    });
    expect(result.suggestedTotal).toBe(0);
    expect(result.categories[0].plannedAmount).toBe(0);
  });

  it("passes through actualAmount unchanged for planned-vs-actual comparison", () => {
    const result = computeInvestmentSuggestion({
      monthlyIncome: 100_000,
      obligationsDue: 0,
      bufferTarget: 0,
      bufferCurrent: 0,
      categories: [{ id: "a", name: "X", investmentType: "GOLD", percentage: 100, actualAmount: 42_000 }],
    });
    expect(result.categories[0].actualAmount).toBe(42_000);
    expect(result.categories[0].plannedAmount).toBe(100_000);
  });
});

describe("loansDueThisMonth", () => {
  const TZ = "Asia/Karachi"; // UTC+5, no DST
  const at = (iso: string) => new Date(iso);
  const loan = (p: Partial<{ type: string; status: string; remainingAmount: number; dueDate: Date | null }>) => ({
    type: "RECEIVED", status: "ACTIVE", remainingAmount: 1_000, dueDate: at("2026-10-15T07:00:00Z"), ...p,
  });

  it("sums what's left on borrowed loans due this month", () => {
    expect(loansDueThisMonth([loan({}), loan({ remainingAmount: 500, status: "PARTIALLY_PAID" })], 10, 2026, TZ)).toBe(1_500);
  });

  it("ignores money you lent and closed loans", () => {
    expect(loansDueThisMonth([loan({ type: "GIVEN" }), loan({ status: "PAID" }), loan({ status: "WRITTEN_OFF" })], 10, 2026, TZ)).toBe(0);
  });

  it("counts overdue loans, including ones due before the budget month started early", () => {
    expect(loansDueThisMonth([
      loan({ dueDate: at("2026-09-30T07:00:00Z") }), // due the day before October's budget
      loan({ dueDate: at("2025-10-15T07:00:00Z") }), // a year overdue
    ], 10, 2026, TZ)).toBe(2_000);
  });

  it("ignores loans due after this month or with no due date", () => {
    expect(loansDueThisMonth([loan({ dueDate: at("2026-11-01T07:00:00Z") }), loan({ dueDate: null })], 10, 2026, TZ)).toBe(0);
  });

  it("decides the month in the household's timezone, not the server's", () => {
    // 31 Oct 20:00 UTC is already 1 Nov in Karachi.
    const late = [loan({ dueDate: at("2026-10-31T20:00:00Z") })];
    expect(loansDueThisMonth(late, 10, 2026, TZ)).toBe(0);
    expect(loansDueThisMonth(late, 11, 2026, TZ)).toBe(1_000);
    // A mobile-entered due date (UTC midnight) is that same day in Karachi.
    expect(loansDueThisMonth([loan({ dueDate: at("2026-10-31T00:00:00Z") })], 10, 2026, TZ)).toBe(1_000);
  });
});
