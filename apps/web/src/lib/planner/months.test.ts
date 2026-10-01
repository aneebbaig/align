import { describe, expect, it } from "vitest";
import { currentMonthKey, monthKeyToParts, toMonthKey } from "./months";

describe("month keys", () => {
  it("round-trips month and year", () => {
    expect(toMonthKey(9, 2026)).toBe(2026 * 12 + 8);
    expect(monthKeyToParts(toMonthKey(9, 2026))).toEqual({ month: 9, year: 2026 });
    expect(monthKeyToParts(toMonthKey(12, 2026))).toEqual({ month: 12, year: 2026 });
    expect(monthKeyToParts(toMonthKey(1, 2027))).toEqual({ month: 1, year: 2027 });
  });

  it("consecutive months are consecutive keys across a year end", () => {
    expect(toMonthKey(1, 2027) - toMonthKey(12, 2026)).toBe(1);
  });

  it("current month key uses the local calendar month", () => {
    expect(currentMonthKey(new Date(2026, 9, 1))).toBe(toMonthKey(10, 2026));
  });
});
