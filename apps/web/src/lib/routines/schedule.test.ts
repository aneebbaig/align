import { describe, expect, it } from "vitest";
import { addDays, dayView, todayString, isoWeekday, isScheduledOn, stats, type CompletionLike, type RoutineLike } from "./schedule";

const TZ = "Asia/Karachi"; // UTC+5
const routine = (id: string, p: Partial<RoutineLike> = {}): RoutineLike => ({
  id, title: `R-${id}`, time: "06:00", days: [1, 2, 3, 4, 5, 6, 7], date: null, active: true, ...p,
});
const done = (routineId: string, date: string, iso: string): CompletionLike => ({ routineId, date, completedAt: new Date(iso) });

describe("dates", () => {
  it("computes ISO weekdays (Monday = 1, Sunday = 7)", () => {
    expect(isoWeekday("2026-10-14")).toBe(3); // Wednesday
    expect(isoWeekday("2026-10-18")).toBe(7); // Sunday
  });
  it("adds days across month ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isScheduledOn", () => {
  it("matches weekday routines on their days only", () => {
    const r = routine("a", { days: [1, 3] });
    expect(isScheduledOn(r, "2026-10-14")).toBe(true);
    expect(isScheduledOn(r, "2026-10-15")).toBe(false);
  });
  it("matches one-offs on their date only", () => {
    const r = routine("a", { days: [], date: "2026-10-14" });
    expect(isScheduledOn(r, "2026-10-14")).toBe(true);
    expect(isScheduledOn(r, "2026-10-21")).toBe(false);
  });
  it("never matches inactive routines", () => {
    expect(isScheduledOn(routine("a", { active: false }), "2026-10-14")).toBe(false);
  });
});

describe("dayView", () => {
  it("lists scheduled items sorted by time with done state and minute delta", () => {
    const rs = [routine("gym", { time: "18:00" }), routine("wake", { time: "06:00" }), routine("off", { days: [1] })];
    // 18:12 in Karachi = 13:12Z
    const items = dayView(rs, [done("gym", "2026-10-14", "2026-10-14T13:12:00Z")], "2026-10-14", TZ);
    expect(items.map((i) => [i.routineId, i.done, i.deltaMinutes])).toEqual([["wake", false, null], ["gym", true, 12]]);
  });
  it("reports early ticks as negative and after-midnight ticks as large positive, still done", () => {
    const rs = [routine("a", { time: "23:00" }), routine("b", { time: "22:00" })];
    const items = dayView(rs, [
      done("a", "2026-10-14", "2026-10-14T17:57:00Z"), // 22:57 local, -3
      done("b", "2026-10-14", "2026-10-14T19:30:00Z"), // 00:30 next day local
    ], "2026-10-14", TZ);
    const byId = Object.fromEntries(items.map((i) => [i.routineId, i]));
    expect(byId.a.deltaMinutes).toBe(-3);
    expect(byId.b.done).toBe(true);
    expect(byId.b.deltaMinutes).toBe(150);
  });
  it("ignores completions for other dates", () => {
    const items = dayView([routine("a")], [done("a", "2026-10-13", "2026-10-13T01:00:00Z")], "2026-10-14", TZ);
    expect(items[0].done).toBe(false);
  });
});

describe("stats", () => {
  const rs = [routine("a"), routine("b", { days: [1, 2, 3, 4, 5] })]; // b not on weekends
  const day = (date: string, ids: string[]) => ids.map((id) => done(id, date, `${date}T01:00:00Z`));

  it("counts done and scheduled per day, ignoring unscheduled completions", () => {
    // 2026-10-17 is a Saturday: only "a" is scheduled; the "b" completion is ignored.
    const s = stats(rs, [...day("2026-10-17", ["a", "b"])], "2026-10-17", "2026-10-17");
    expect(s.days).toEqual([{ date: "2026-10-17", scheduled: 1, done: 1 }]);
  });
  it("computes current and best streaks over complete days", () => {
    const comps = [
      ...day("2026-10-12", ["a", "b"]), ...day("2026-10-13", ["a", "b"]), // Mon, Tue complete
      ...day("2026-10-14", ["a"]), // Wed incomplete
      ...day("2026-10-15", ["a", "b"]), ...day("2026-10-16", ["a", "b"]), // Thu, Fri complete
    ];
    const s = stats(rs, comps, "2026-10-12", "2026-10-16");
    expect(s.bestStreak).toBe(2);
    expect(s.currentStreak).toBe(2);
  });
  it("skips days with nothing scheduled", () => {
    const only = [routine("w", { days: [1, 3] })];
    const comps = [done("w", "2026-10-12", "2026-10-12T01:00:00Z"), done("w", "2026-10-14", "2026-10-14T01:00:00Z")];
    expect(stats(only, comps, "2026-10-12", "2026-10-15").currentStreak).toBe(2);
  });
  it("does not let a day still in progress break the streak", () => {
    const comps = [...day("2026-10-12", ["a", "b"]), ...day("2026-10-13", ["a", "b"])];
    const s = stats(rs, comps, "2026-10-12", "2026-10-14"); // Wed has nothing ticked yet
    expect(s.currentStreak).toBe(2);
  });
  it("is zero when the last finished day was missed", () => {
    const comps = [...day("2026-10-12", ["a", "b"])];
    const s = stats(rs, comps, "2026-10-12", "2026-10-14"); // Tue missed, Wed in progress
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(1);
  });
});

describe("todayString", () => {
  it("uses the household timezone, not UTC", () => {
    // 20:00Z is already the next calendar day in Karachi (UTC+5).
    expect(todayString(new Date("2026-10-14T20:00:00Z"), TZ)).toBe("2026-10-15");
    expect(todayString(new Date("2026-10-14T18:00:00Z"), TZ)).toBe("2026-10-14");
  });
});
