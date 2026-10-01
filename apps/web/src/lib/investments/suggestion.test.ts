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
  const loan = (p: Partial<{ type: string; status: string; remainingAmount: number; dueDate: Date | null }>) => ({
    type: "RECEIVED", status: "ACTIVE", remainingAmount: 1_000, dueDate: new Date(2026, 9, 15), ...p,
  });

  it("sums what's left on borrowed loans due this month", () => {
    expect(loansDueThisMonth([loan({}), loan({ remainingAmount: 500, status: "PARTIALLY_PAID" })], 10, 2026)).toBe(1_500);
  });

  it("ignores money you lent", () => {
    expect(loansDueThisMonth([loan({ type: "GIVEN" })], 10, 2026)).toBe(0);
  });

  it("ignores closed loans", () => {
    expect(loansDueThisMonth([loan({ status: "PAID" }), loan({ status: "WRITTEN_OFF" })], 10, 2026)).toBe(0);
  });

  it("ignores loans due in another month or with no due date", () => {
    expect(loansDueThisMonth([
      loan({ dueDate: new Date(2026, 10, 1) }),
      loan({ dueDate: new Date(2026, 8, 30) }),
      loan({ dueDate: new Date(2025, 9, 15) }),
      loan({ dueDate: null }),
    ], 10, 2026)).toBe(0);
  });

  it("counts the first and last day of the month", () => {
    expect(loansDueThisMonth([loan({ dueDate: new Date(2026, 9, 1) }), loan({ dueDate: new Date(2026, 9, 31, 23, 59) })], 10, 2026)).toBe(2_000);
  });
});
