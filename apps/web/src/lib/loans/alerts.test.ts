import { describe, expect, it } from "vitest";
import { upcomingLoanAlerts } from "./alerts";

const today = new Date(2026, 9, 1, 14, 30); // 1 Oct 2026, mid-afternoon
const loan = (id: string, dueDate: Date | null, p: Partial<{ type: string; status: string; remainingAmount: number }> = {}) => ({
  id, personName: `P-${id}`, type: "RECEIVED", status: "ACTIVE", remainingAmount: 1_000, dueDate, ...p,
});

describe("upcomingLoanAlerts", () => {
  it("includes loans due today through 7 days ahead, soonest first", () => {
    const alerts = upcomingLoanAlerts([
      loan("week", new Date(2026, 9, 8)),
      loan("today", new Date(2026, 9, 1, 9, 0)),
      loan("tomorrow", new Date(2026, 9, 2)),
    ], today);
    expect(alerts.map((a) => [a.loanId, a.daysUntil])).toEqual([["today", 0], ["tomorrow", 1], ["week", 7]]);
  });

  it("excludes loans due in 8 days or already past", () => {
    expect(upcomingLoanAlerts([loan("late", new Date(2026, 9, 9)), loan("past", new Date(2026, 8, 30))], today)).toEqual([]);
  });

  it("excludes closed loans and loans with no due date, but includes lent money", () => {
    const alerts = upcomingLoanAlerts([
      loan("paid", new Date(2026, 9, 2), { status: "PAID" }),
      loan("off", new Date(2026, 9, 2), { status: "WRITTEN_OFF" }),
      loan("none", null),
      loan("lent", new Date(2026, 9, 3), { type: "GIVEN" }),
    ], today);
    expect(alerts.map((a) => a.loanId)).toEqual(["lent"]);
    expect(alerts[0]).toMatchObject({ personName: "P-lent", type: "GIVEN", amount: 1_000, daysUntil: 2 });
  });

  it("respects a custom window", () => {
    expect(upcomingLoanAlerts([loan("w", new Date(2026, 9, 4))], today, 2)).toEqual([]);
  });
});
