import { describe, it, expect } from "vitest";
import { planTotals } from "./totals";

const item = (estimatedCost: number, actualCost: number | null, status = "PENDING") => ({ estimatedCost, actualCost, status });

describe("planTotals", () => {
  it("counts only bought items as paid, at their actual cost", () => {
    const t = planTotals([item(100, 120, "PAID"), item(200, 150), item(300, null)]);
    expect(t.estimated).toBe(600);
    expect(t.paid).toBe(120); // the 150 quote on a pending item is not a payment
  });
  it("falls back to the estimate for a bought item with no actual cost", () => {
    expect(planTotals([item(100, null, "PAID")]).paid).toBe(100);
  });
  it("prices what is left at the quote where there is one, skipping skipped items", () => {
    const t = planTotals([item(100, null, "PAID"), item(200, 150), item(300, null), item(50, null, "SKIPPED")]);
    expect(t.remaining).toBe(450);
  });
  it("uses the fixed total for fixed plans", () => {
    const t = planTotals([item(10, 10, "PAID")], 1000);
    expect(t).toEqual({ estimated: 1000, paid: 10, remaining: 990 });
  });
});
