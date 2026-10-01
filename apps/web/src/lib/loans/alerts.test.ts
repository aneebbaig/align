import { describe, expect, it } from "vitest";
import { upcomingLoanAlerts } from "./alerts";

const TZ = "Asia/Karachi"; // UTC+5, no DST
const at = (iso: string) => new Date(iso);
const today = at("2026-10-01T09:30:00Z"); // 1 Oct, 14:30 in Karachi
const loan = (id: string, dueDate: Date | null, p: Partial<{ type: string; status: string; remainingAmount: number }> = {}) => ({
  id, personName: `P-${id}`, type: "RECEIVED", status: "ACTIVE", remainingAmount: 1_000, dueDate, ...p,
});

describe("upcomingLoanAlerts", () => {
  it("includes loans due today through 7 days ahead, soonest first", () => {
    const alerts = upcomingLoanAlerts([
      loan("week", at("2026-10-08T04:00:00Z")),
      loan("today", at("2026-10-01T04:00:00Z")),
      loan("tomorrow", at("2026-10-02T04:00:00Z")),
    ], today, 7, TZ);
    expect(alerts.map((a) => [a.loanId, a.daysUntil])).toEqual([["today", 0], ["tomorrow", 1], ["week", 7]]);
  });

  it("includes overdue loans first, with negative days", () => {
    const alerts = upcomingLoanAlerts([loan("soon", at("2026-10-03T04:00:00Z")), loan("late", at("2026-09-20T04:00:00Z"))], today, 7, TZ);
    expect(alerts.map((a) => [a.loanId, a.daysUntil])).toEqual([["late", -11], ["soon", 2]]);
  });

  it("excludes loans due in 8 days or more", () => {
    expect(upcomingLoanAlerts([loan("far", at("2026-10-09T04:00:00Z"))], today, 7, TZ)).toEqual([]);
  });

  it("excludes closed loans and loans with no due date, but includes lent money", () => {
    const alerts = upcomingLoanAlerts([
      loan("paid", at("2026-10-02T04:00:00Z"), { status: "PAID" }),
      loan("off", at("2026-10-02T04:00:00Z"), { status: "WRITTEN_OFF" }),
      loan("none", null),
      loan("lent", at("2026-10-03T04:00:00Z"), { type: "GIVEN" }),
    ], today, 7, TZ);
    expect(alerts.map((a) => a.loanId)).toEqual(["lent"]);
    expect(alerts[0]).toMatchObject({ personName: "P-lent", type: "GIVEN", amount: 1_000, daysUntil: 2 });
  });

  it("counts days in the household's timezone, not the server's", () => {
    // 30 Sep 20:00 UTC is already 1 Oct (01:00) in Karachi; a mobile due date of
    // 1 Oct is stored as UTC midnight - that's "today", not "tomorrow".
    const alerts = upcomingLoanAlerts([loan("m", at("2026-10-01T00:00:00Z"))], at("2026-09-30T20:00:00Z"), 7, TZ);
    expect(alerts[0].daysUntil).toBe(0);
  });
});
