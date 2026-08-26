import { describe, expect, it } from "vitest";
import { computeInvestmentSuggestion } from "./investment-suggestion";

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
