import { describe, it, expect } from "vitest";
import { sumTotals, paymentStatus, balanceOf, varianceOf, cheapestQuote, quoteSpread, groupTotals } from "./totals";

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
});
