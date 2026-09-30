import { describe, expect, it } from "vitest";
import { toLocalDate } from "./utils";

describe("toLocalDate", () => {
  it("reads a plain yyyy-MM-dd date as local midnight", () => {
    const d = toLocalDate("2026-09-30");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 30, 0]);
  });

  it("accepts the ISO datetime the mobile app sends, keeping only the date", () => {
    const d = toLocalDate("2026-09-30T14:23:11.123456");
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 30, 0]);
  });
});
