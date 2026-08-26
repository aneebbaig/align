import { describe, expect, it } from "vitest";
import { projectCashflow } from "./scheduler";
import {
  GOLDEN_EXPECTED,
  GOLDEN_INCOMES,
  GOLDEN_OBLIGATIONS,
} from "./golden-scenario";
import type { ObligationRule } from "./types";

describe("projectCashflow — golden scenario (spec Checkpoint 1)", () => {
  const projection = projectCashflow({
    obligations: GOLDEN_OBLIGATIONS,
    incomes: GOLDEN_INCOMES,
    months: 8,
  });

  it("projects 8 months", () => {
    expect(projection).toHaveLength(8);
  });

  it("matches the expected due-total, flag and shortfall for every month", () => {
    const actual = projection.map((m) => ({
      month: m.month,
      dueTotal: m.dueTotal,
      flagged: m.flagged,
      shortfall: m.shortfall,
    }));
    expect(actual).toEqual(GOLDEN_EXPECTED.map((e) => ({ ...e })));
  });

  it("month 4 aggregates Loan A tranche 2 (60k) + Loan B (83k) = 143k", () => {
    const m4 = projection[3];
    expect(m4.dueTotal).toBe(143_000);
    expect(m4.items.map((i) => i.amount).sort((a, b) => a - b)).toEqual([60_000, 83_000]);
  });

  it("suggests sliding the FLEXIBLE Loan B first in tight month 4, which resolves the shortfall", () => {
    const m4 = projection[3];
    expect(m4.slideSuggestions).toHaveLength(1);
    const [s] = m4.slideSuggestions;
    expect(s.sourceId).toBe("loanB");
    expect(s.dueTotalAfterSlide).toBe(60_000); // 143k − 83k
    expect(s.resolvesShortfall).toBe(true); // 60k ≤ 111k floor
  });

  it("never suggests sliding a FIXED obligation (month 2 tuition is immovable)", () => {
    const m2 = projection[1];
    expect(m2.flagged).toBe(true);
    expect(m2.slideSuggestions).toHaveLength(0);
  });

  it("reports both the reliable floor (111k) and total expected income (266k)", () => {
    const m1 = projection[0];
    expect(m1.floorIncome).toBe(111_000);
    expect(m1.expectedIncome).toBe(266_000); // salary 155k + floor 111k
  });
});

describe("projectCashflow — horizon is configurable", () => {
  it("defaults to 8 months", () => {
    expect(projectCashflow({ obligations: [], incomes: [] })).toHaveLength(8);
  });

  it("honors a custom horizon", () => {
    expect(projectCashflow({ obligations: [], incomes: [], months: 12 })).toHaveLength(12);
  });
});

describe("projectCashflow — edge cases", () => {
  it("a FIXED_INSTALLMENT without endMonth is a single installment", () => {
    const rule: ObligationRule = {
      id: "x", sourceId: "x", payee: "X", category: "LOAN", kind: "FIXED_INSTALLMENT",
      amount: 5_000, startMonth: 2, flexibility: "FIXED", priority: 0, slideWindowMonths: 0,
    };
    const p = projectCashflow({ obligations: [rule], incomes: [], months: 4 });
    expect(p.map((m) => m.dueTotal)).toEqual([0, 5_000, 0, 0]);
  });

  it("with no floor income, any obligation flags", () => {
    const rule: ObligationRule = {
      id: "x", sourceId: "x", payee: "X", category: "EXPENSE", kind: "LUMP_SUM",
      amount: 1, startMonth: 1, flexibility: "FIXED", priority: 0, slideWindowMonths: 0,
    };
    const [m1] = projectCashflow({ obligations: [rule], incomes: [], months: 1 });
    expect(m1.flagged).toBe(true);
    expect(m1.shortfall).toBe(1);
  });
});
