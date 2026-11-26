import { describe, it, expect } from "vitest";
import { computeCarry, incomeChangeDeficit, periodKey } from "./carryover";

const k = (year: number, month: number) => periodKey({ month, year });

describe("carry-over", () => {
  it("is all zero with no data", () => {
    expect(computeCarry([], { month: 5, year: 2026 })).toEqual({ carryIn: 0, available: 0, cumulativeAtPeriod: 0 });
  });
  it("a single period carries nothing in", () => {
    const r = computeCarry([{ key: k(2026, 5), net: 700 }], { month: 5, year: 2026 });
    expect(r).toEqual({ carryIn: 0, available: 700, cumulativeAtPeriod: 700 });
  });
  it("carries unspent income from two earlier periods", () => {
    const nets = [{ key: k(2026, 3), net: 100 }, { key: k(2026, 4), net: 50 }, { key: k(2026, 5), net: 300 }];
    const r = computeCarry(nets, { month: 5, year: 2026 });
    expect(r.carryIn).toBe(150);
    expect(r.available).toBe(450);
  });
  it("an old negative period carries nothing forward", () => {
    const nets = [{ key: k(2026, 3), net: -80 }, { key: k(2026, 4), net: 300 }];
    const r = computeCarry(nets, { month: 4, year: 2026 });
    expect(r.carryIn).toBe(0);
    expect(r.available).toBe(300);
  });
  it("a legacy negative period does not drag later periods below zero", () => {
    const nets = [{ key: k(2026, 1), net: -500 }, { key: k(2026, 2), net: 200 }, { key: k(2026, 3), net: 100 }];
    const r = computeCarry(nets, { month: 3, year: 2026 });
    expect(r.carryIn).toBe(200);
    expect(r.cumulativeAtPeriod).toBe(300);
    expect(r.available).toBe(300);
    expect(computeCarry(nets, { month: 1, year: 2026 }).available).toBe(0);
  });
  it("a later period's spending shrinks what an old period can still use", () => {
    const nets = [{ key: k(2026, 3), net: 500 }, { key: k(2026, 4), net: -400 }];
    const r = computeCarry(nets, { month: 3, year: 2026 });
    expect(r.cumulativeAtPeriod).toBe(500);
    expect(r.available).toBe(100);
  });
  it("backdated spend before a negative period is absorbed by it", () => {
    const nets = [{ key: k(2026, 3), net: 500 }, { key: k(2026, 4), net: -900 }, { key: k(2026, 5), net: 200 }];
    // April is negative (-400), so it carries 0 into May; March can use all 500.
    expect(computeCarry(nets, { month: 3, year: 2026 }).available).toBe(500);
    expect(computeCarry(nets, { month: 5, year: 2026 }).carryIn).toBe(0);
  });
  it("handles a period with no row, across a gap and unsorted input", () => {
    const nets = [{ key: k(2026, 6), net: 40 }, { key: k(2026, 2), net: 200 }];
    const r = computeCarry(nets, { month: 4, year: 2026 });
    expect(r.carryIn).toBe(200);
    expect(r.cumulativeAtPeriod).toBe(200);
    expect(r.available).toBe(200);
  });
});

describe("incomeChangeDeficit", () => {
  const before = [{ key: k(2026, 3), net: 500 }, { key: k(2026, 4), net: -300 }];
  it("allows a shrink that still fits", () => {
    const after = [{ key: k(2026, 3), net: 300 }, { key: k(2026, 4), net: -300 }];
    expect(incomeChangeDeficit(before, after, k(2026, 3))).toBe(0);
  });
  it("refuses a shrink that leaves a later period negative", () => {
    const after = [{ key: k(2026, 3), net: 100 }, { key: k(2026, 4), net: -300 }];
    expect(incomeChangeDeficit(before, after, k(2026, 3))).toBe(200);
  });
  it("refuses making an already-negative period worse", () => {
    const b = [{ key: k(2026, 3), net: -100 }];
    const a = [{ key: k(2026, 3), net: -150 }];
    expect(incomeChangeDeficit(b, a, k(2026, 3))).toBe(50);
  });
  it("allows an already-negative period left unchanged", () => {
    const b = [{ key: k(2026, 1), net: -100 }, { key: k(2026, 2), net: 50 }];
    expect(incomeChangeDeficit(b, b, k(2026, 1))).toBe(0);
  });
});
