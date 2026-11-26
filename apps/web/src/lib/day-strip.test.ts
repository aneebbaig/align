import { describe, it, expect } from "vitest";
import { buildDayChips, stepDay, readLastUsed, parseDateStr, toDateStr, isInStrip } from "./day-strip";

const today = new Date(2026, 10, 26, 15, 0); // Thu 26 Nov 2026, local

describe("buildDayChips", () => {
  it("lists 14 days newest first with friendly labels", () => {
    const c = buildDayChips({ today, selected: "2026-11-26" });
    expect(c).toHaveLength(14);
    expect(c[0]).toMatchObject({ value: "2026-11-26", label: "Today" });
    expect(c[1]).toMatchObject({ value: "2026-11-25", label: "Yesterday" });
    expect(c[2]).toMatchObject({ value: "2026-11-24", label: "Tue 24" });
    expect(c[13].value).toBe("2026-11-13");
  });
  it("puts an out-of-strip pick first, then a last-used chip", () => {
    const c = buildDayChips({ today, selected: "2026-10-02", lastUsed: "2026-11-01" });
    expect(c[0]).toMatchObject({ kind: "picked", label: "2 Oct" });
    expect(c[1]).toMatchObject({ kind: "last", label: "Last: 1 Nov" });
    expect(c).toHaveLength(16);
  });
  it("skips last-used when it is already in the strip", () => {
    expect(buildDayChips({ today, selected: "2026-11-26", lastUsed: "2026-11-24" })).toHaveLength(14);
    expect(isInStrip("2026-11-12", today)).toBe(false);
  });
});

describe("stepDay", () => {
  it("moves one day and clamps at today", () => {
    expect(stepDay("2026-11-26", -1, today)).toBe("2026-11-25");
    expect(stepDay("2026-11-26", 1, today)).toBe("2026-11-26");
    expect(stepDay("2026-12-01", 1, today)).toBe("2026-11-26");
    expect(stepDay("2026-12-01", -1, today)).toBe("2026-11-26");
    expect(stepDay("2026-03-01", -1, today)).toBe("2026-02-28");
  });
});

describe("readLastUsed", () => {
  const saved = (date: string, minsAgo: number) => JSON.stringify({ date, savedAt: new Date(today.getTime() - minsAgo * 60000).toISOString() });
  it("returns a recent non-today date", () => {
    expect(readLastUsed(saved("2026-11-20", 10), today)).toBe("2026-11-20");
  });
  it("ignores old, today and junk values", () => {
    expect(readLastUsed(saved("2026-11-20", 45), today)).toBeNull();
    expect(readLastUsed(saved("2026-11-26", 5), today)).toBeNull();
    expect(readLastUsed("nope", today)).toBeNull();
    expect(readLastUsed(null, today)).toBeNull();
  });
});

describe("date strings", () => {
  it("round-trips local days", () => {
    expect(toDateStr(parseDateStr("2026-03-08"))).toBe("2026-03-08");
  });
});
