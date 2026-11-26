import { describe, expect, it } from "vitest";
import { addMonthAfter, addMonthBefore, currentMonthKey, removeFirstMonth, removeLastMonth, monthKeyToParts, toMonthKey } from "./months";

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

describe("forecast range edits", () => {
  it("adds a month before, wrapping Jan to the previous Dec", () => {
    expect(addMonthBefore({ startMonth: 1, startYear: 2027, months: 6 })).toEqual({ startMonth: 12, startYear: 2026, months: 7 });
    expect(addMonthBefore({ startMonth: 4, startYear: 2026, months: 6 })).toEqual({ startMonth: 3, startYear: 2026, months: 7 });
  });
  it("removes the first month, wrapping Dec to the next Jan", () => {
    expect(removeFirstMonth({ startMonth: 12, startYear: 2026, months: 6 })).toEqual({ startMonth: 1, startYear: 2027, months: 5 });
  });
  it("adds and removes at the end without moving the start", () => {
    expect(addMonthAfter({ startMonth: 4, startYear: 2026, months: 6 })).toEqual({ startMonth: 4, startYear: 2026, months: 7 });
    expect(removeLastMonth({ startMonth: 4, startYear: 2026, months: 6 })).toEqual({ startMonth: 4, startYear: 2026, months: 5 });
  });
  it("respects the 1 and 120 month limits", () => {
    const one = { startMonth: 4, startYear: 2026, months: 1 };
    const max = { startMonth: 4, startYear: 2026, months: 120 };
    expect(removeFirstMonth(one)).toBeNull();
    expect(removeLastMonth(one)).toBeNull();
    expect(addMonthBefore(max)).toBeNull();
    expect(addMonthAfter(max)).toBeNull();
  });
});
