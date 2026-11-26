import { describe, it, expect } from "vitest";
import { matchesSearch, matchesStatus, statusCounts, type FilterRow } from "./filters";

const row = (over: Partial<FilterRow> = {}): FilterRow => ({
  name: "Venue", notes: null, vendorName: null, estimatedAmount: 100, actualAmount: null, paidAmount: 0, quotes: [], ...over,
});

describe("wedding filters", () => {
  it("searches name, vendor, quoting vendors and notes", () => {
    expect(matchesSearch(row({ name: "Photographer" }), "photo")).toBe(true);
    expect(matchesSearch(row({ vendorName: "Studio Nine" }), "nine")).toBe(true);
    expect(matchesSearch(row({ notes: "call back Friday" }), "friday")).toBe(true);
    expect(matchesSearch(row({ quotes: [{ isChosen: false, vendorName: "Zed" }] }), "zed")).toBe(true);
    expect(matchesSearch(row(), "xyz")).toBe(false);
    expect(matchesSearch(row(), "  ")).toBe(true);
  });
  it("filters by status", () => {
    const paid = row({ actualAmount: 100, paidAmount: 100 });
    const part = row({ paidAmount: 40 });
    const open = row({ quotes: [{ isChosen: false }, { isChosen: false }] });
    expect(matchesStatus(paid, "PAID")).toBe(true);
    expect(matchesStatus(paid, "TO_PAY")).toBe(false);
    expect(matchesStatus(part, "PART_PAID")).toBe(true);
    expect(matchesStatus(part, "TO_PAY")).toBe(true);
    expect(matchesStatus(paid, "NEEDS_PRICE")).toBe(false);
    expect(matchesStatus(open, "QUOTES")).toBe(true);
    expect(matchesStatus(row({ quotes: [{ isChosen: true }, { isChosen: false }] }), "QUOTES")).toBe(false);
  });
  it("counts every chip", () => {
    const c = statusCounts([row(), row({ actualAmount: 100, paidAmount: 100 })]);
    expect(c.ALL).toBe(2);
    expect(c.PAID).toBe(1);
    expect(c.TO_PAY).toBe(1);
    expect(c.NEEDS_PRICE).toBe(1);
  });
});
