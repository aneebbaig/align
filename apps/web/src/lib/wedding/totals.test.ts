import { describe, it, expect } from "vitest";
import { sumTotals, paymentStatus, balanceOf, varianceOf, cheapestQuote, quoteSpread, groupTotals, budgetStatus, tippingExpense, unallocated } from "./totals";

const row = (estimatedAmount: number, actualAmount: number | null = null, paidAmount = 0, eventId: string | null = null, category = "MISC") =>
  ({ eventId, category, estimatedAmount, actualAmount, paidAmount });

describe("wedding totals", () => {
  it("projects actual where known, estimate elsewhere", () => {
    const t = sumTotals([row(100, 120), row(200), row(50, 40)]);
    expect(t.estimated).toBe(350);
    expect(t.projected).toBe(120 + 200 + 40);
    expect(t.actual).toBe(160);
    expect(t.priced).toBe(2);
  });
  it("derives payment status from what was paid against the cost", () => {
    expect(paymentStatus(row(100))).toBe("UNPAID");
    expect(paymentStatus(row(100, null, 30))).toBe("PART_PAID");
    expect(paymentStatus(row(100, null, 100))).toBe("PAID");
    expect(paymentStatus(row(100, 150, 100))).toBe("PART_PAID"); // the real price went up
    expect(paymentStatus(row(0, null, 10))).toBe("PART_PAID"); // nothing priced yet
  });
  it("tracks the balance still owed, never negative", () => {
    expect(balanceOf(row(100, null, 30))).toBe(70);
    expect(balanceOf(row(100, 80, 100))).toBe(0);
    expect(sumTotals([row(100, null, 30), row(200, 150, 150)]).outstanding).toBe(70);
  });
  it("reports variance only once a real price exists", () => {
    expect(varianceOf(row(100))).toBeNull();
    expect(varianceOf(row(100, 130))).toBe(30);
    expect(varianceOf(row(100, 80))).toBe(-20);
    expect(varianceOf(row(0, 80))).toBeNull();
  });
  it("groups totals by key", () => {
    const g = groupTotals([row(100, null, 0, "a"), row(50, 60, 0, "a"), row(70, null, 0, null)], (e) => e.eventId ?? "general");
    expect(g.get("a")?.projected).toBe(160);
    expect(g.get("general")?.estimated).toBe(70);
  });
  it("flags the cheapest quote only when there is a clear winner", () => {
    const q = (id: string, amount: number) => ({ id, amount, isChosen: false });
    expect(cheapestQuote([q("a", 5)])).toBeNull();
    expect(cheapestQuote([q("a", 5), q("b", 3), q("c", 9)])?.id).toBe("b");
    expect(cheapestQuote([q("a", 3), q("b", 3), q("c", 9)])).toBeNull();
    expect(quoteSpread([q("a", 5), q("b", 3), q("c", 9)])).toBe(6);
  });

  it("classifies budget status", () => {
    expect(budgetStatus(100, 0).state).toBe("none");
    expect(budgetStatus(500, 1000).state).toBe("ok");
    expect(budgetStatus(850, 1000).state).toBe("close");
    expect(budgetStatus(1000, 1000).state).toBe("close"); // exactly on budget is not over
    const over = budgetStatus(1450, 1000);
    expect([over.state, over.overBy, over.left]).toEqual(["over", 450, 0]);
    expect(budgetStatus(700, 1000).left).toBe(300);
  });
  it("finds the expense that tips an event over budget", () => {
    const r = (id: string, est: number, act: number | null = null) => ({ id, ...row(est, act) });
    const rows = [r("a", 100), r("b", 150, 200), r("c", 100)];
    expect(tippingExpense(rows, 250)).toEqual({ id: "b", overBy: 50 });
    expect(tippingExpense(rows, 1000)).toBeNull();
    expect(tippingExpense(rows, 0)).toBeNull();
    // a single expense bigger than the whole budget: over by its own cost at most
    expect(tippingExpense([r("x", 500)], 100)).toEqual({ id: "x", overBy: 400 });
  });
  it("computes the budget left unallocated", () => {
    expect(unallocated(1000, [{ budgetAllocated: 300 }, { budgetAllocated: 200 }])).toBe(500);
    expect(unallocated(1000, [{ budgetAllocated: 700 }, { budgetAllocated: 600 }])).toBe(-300);
  });
});
