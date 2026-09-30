import { describe, expect, it } from "vitest";
import { computePlannerTable, lineAmountAt, type PlannerInput, type PlannerInputLine } from "./compute";
import { toMonthKey as mk } from "./months";

function line(partial: Partial<PlannerInputLine> & { id: string }): PlannerInputLine {
  return { name: partial.id, direction: "IN", currency: "PKR", order: 0, steps: [], overrides: [], ...partial };
}

function input(partial: Partial<PlannerInput>): PlannerInput {
  return { startMonthKey: mk(1, 2027), months: 3, startingCash: 0, usdRate: 278, lines: [], goals: [], ...partial };
}

describe("lineAmountAt", () => {
  const l = line({
    id: "a",
    steps: [{ monthKey: mk(1, 2027), amount: 100 }, { monthKey: mk(3, 2027), amount: 300 }],
    overrides: [{ monthKey: mk(4, 2027), amount: 50 }],
  });

  it("is 0 before the first step", () => expect(lineAmountAt(l, mk(12, 2026))).toEqual({ native: 0, isOverride: false }));
  it("uses the latest step at or before the month", () => {
    expect(lineAmountAt(l, mk(2, 2027))).toEqual({ native: 100, isOverride: false });
    expect(lineAmountAt(l, mk(3, 2027))).toEqual({ native: 300, isOverride: false });
  });
  it("an override wins for its month only", () => {
    expect(lineAmountAt(l, mk(4, 2027))).toEqual({ native: 50, isOverride: true });
    expect(lineAmountAt(l, mk(5, 2027))).toEqual({ native: 300, isOverride: false });
  });
});

describe("computePlannerTable", () => {
  it("steps before the start still apply", () => {
    const rows = computePlannerTable(input({ lines: [line({ id: "salary", steps: [{ monthKey: mk(6, 2025), amount: 1000 }] })] }));
    expect(rows.map((r) => r.net)).toEqual([1000, 1000, 1000]);
  });

  it("a 0 step ends a line", () => {
    const rows = computePlannerTable(input({
      lines: [line({ id: "fee", direction: "OUT", steps: [{ monthKey: mk(1, 2027), amount: 38_000 }, { monthKey: mk(3, 2027), amount: 0 }] })],
    }));
    expect(rows.map((r) => r.net)).toEqual([-38_000, -38_000, 0]);
  });

  it("zero out-line yields 0 not -0", () => {
    const rows = computePlannerTable(input({ months: 1, lines: [line({ id: "x", direction: "OUT" })] }));
    expect(Object.is(rows[0].cells[0].signed, -0)).toBe(false);
    expect(Object.is(rows[0].net, -0)).toBe(false);
  });

  it("converts USD lines at the planner rate, rounded to whole paisas", () => {
    const rows = computePlannerTable(input({
      months: 1,
      usdRate: 278.5,
      lines: [line({ id: "fl", currency: "USD", steps: [{ monthKey: mk(1, 2027), amount: 3 }] })], // 3 cents
    }));
    expect(rows[0].cells[0]).toEqual({ lineId: "fl", native: 3, pkr: 836, signed: 836, isOverride: false }); // 835.5 -> 836
  });

  it("orders cells by line order", () => {
    const rows = computePlannerTable(input({ months: 1, lines: [line({ id: "b", order: 2 }), line({ id: "a", order: 1 })] }));
    expect(rows[0].cells.map((c) => c.lineId)).toEqual(["a", "b"]);
  });

  it("goals reduce available but not net, and several can share a month", () => {
    const rows = computePlannerTable(input({
      startingCash: 10_000,
      lines: [line({ id: "s", steps: [{ monthKey: mk(1, 2027), amount: 5_000 }] })],
      goals: [
        { id: "g2", name: "B", monthKey: mk(2, 2027), amount: 3_000, note: null, order: 2 },
        { id: "g1", name: "A", monthKey: mk(2, 2027), amount: 4_000, note: "reserved", order: 1 },
      ],
    }));
    expect(rows.map((r) => r.net)).toEqual([5_000, 5_000, 5_000]);
    expect(rows.map((r) => r.goalsTotal)).toEqual([0, 7_000, 0]);
    expect(rows.map((r) => r.available)).toEqual([15_000, 13_000, 18_000]);
    expect(rows[1].goals.map((g) => g.id)).toEqual(["g1", "g2"]);
  });

  it("available can go negative", () => {
    const rows = computePlannerTable(input({ months: 1, goals: [{ id: "g", name: "G", monthKey: mk(1, 2027), amount: 100, note: null, order: 0 }] }));
    expect(rows[0].available).toBe(-100);
  });

  it("overrides and goals outside the horizon are ignored, not lost", () => {
    const l = line({ id: "a", steps: [{ monthKey: mk(1, 2027), amount: 10 }], overrides: [{ monthKey: mk(9, 2027), amount: 99 }] });
    const goal = { id: "g", name: "Later", monthKey: mk(9, 2027), amount: 5, note: null, order: 0 };
    const short = computePlannerTable(input({ months: 3, lines: [l], goals: [goal] }));
    expect(short).toHaveLength(3);
    expect(short.every((r) => r.goalsTotal === 0)).toBe(true);
    const long = computePlannerTable(input({ months: 12, lines: [l], goals: [goal] }));
    expect(long[8].cells[0]).toEqual({ lineId: "a", native: 99, pkr: 99, signed: 99, isOverride: true });
    expect(long[8].goalsTotal).toBe(5);
  });

  it("labels each row with its calendar month across a year end", () => {
    const rows = computePlannerTable(input({ startMonthKey: mk(11, 2026), months: 3 }));
    expect(rows.map((r) => [r.month, r.year])).toEqual([[11, 2026], [12, 2026], [1, 2027]]);
  });

  it("reproduces the owner's 24-month spreadsheet exactly", () => {
    const rs = (n: number) => n * 100; // rupees -> paisas
    const usd = (n: number) => n * 100; // dollars -> cents
    const rows = computePlannerTable({
      startMonthKey: mk(9, 2026),
      months: 24,
      startingCash: 0,
      usdRate: 278,
      lines: [
        line({ id: "savings", order: 1, steps: [
          { monthKey: mk(9, 2026), amount: rs(90_000) }, { monthKey: mk(10, 2026), amount: rs(50_000) },
          { monthKey: mk(1, 2027), amount: rs(30_000) }, { monthKey: mk(7, 2027), amount: rs(50_000) },
        ] }),
        line({ id: "fee", order: 2, direction: "OUT", steps: [
          { monthKey: mk(10, 2026), amount: rs(38_000) }, { monthKey: mk(1, 2027), amount: 0 },
        ] }),
        line({ id: "freelance", order: 3, currency: "USD", steps: [
          { monthKey: mk(1, 2027), amount: usd(50) }, { monthKey: mk(2, 2027), amount: usd(100) },
          { monthKey: mk(3, 2027), amount: usd(150) }, { monthKey: mk(4, 2027), amount: usd(200) },
          { monthKey: mk(5, 2027), amount: usd(250) }, { monthKey: mk(6, 2027), amount: usd(300) },
          { monthKey: mk(7, 2027), amount: usd(350) }, { monthKey: mk(8, 2027), amount: usd(400) },
          { monthKey: mk(11, 2027), amount: usd(450) }, { monthKey: mk(12, 2027), amount: usd(500) },
        ], overrides: [{ monthKey: mk(9, 2027), amount: usd(350) }] }),
        line({ id: "loan", order: 4, direction: "OUT", steps: [
          { monthKey: mk(9, 2026), amount: rs(30_000) }, { monthKey: mk(10, 2026), amount: rs(20_000) },
          { monthKey: mk(11, 2026), amount: rs(17_370) },
        ] }),
      ],
      goals: [
        { id: "ef", name: "Emergency Fund", monthKey: mk(7, 2027), amount: rs(500_000), note: "reserved", order: 0 },
        { id: "engine", name: "Engine Swap", monthKey: mk(9, 2027), amount: rs(300_000), note: "spent", order: 0 },
        { id: "rust", name: "Rusting/Denting", monthKey: mk(11, 2027), amount: rs(200_000), note: "spent", order: 0 },
        { id: "valima", name: "Valima", monthKey: mk(8, 2028), amount: rs(1_500_000), note: "spent", order: 0 },
      ],
    });
    expect(rows.map((r) => r.net / 100)).toEqual([
      60_000, -8_000, -5_370, -5_370, 26_530, 40_430, 54_330, 68_230, 82_130, 96_030, 129_930, 143_830,
      129_930, 143_830, 157_730, 171_630, 171_630, 171_630, 171_630, 171_630, 171_630, 171_630, 171_630, 171_630,
    ]);
    expect(rows.map((r) => r.available / 100)).toEqual([
      60_000, 52_000, 46_630, 41_260, 67_790, 108_220, 162_550, 230_780, 312_910, 408_940, 38_870, 182_700,
      12_630, 156_460, 114_190, 285_820, 457_450, 629_080, 800_710, 972_340, 1_143_970, 1_315_600, 1_487_230, 158_860,
    ]);
    expect(rows[10].cells.find((c) => c.lineId === "freelance")?.pkr).toBe(rs(97_300));
  });
});
