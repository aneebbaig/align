import { describe, expect, it } from "vitest";
import { completionSchema, routineSchema, routineUpdateSchema } from "./schemas";

const ok = { title: "Gym", time: "18:00", days: [1, 3, 5] };

describe("routineSchema", () => {
  it("accepts a weekday routine and normalises days", () => {
    const r = routineSchema.parse({ ...ok, days: [5, 1, 1, 3] });
    expect(r.days).toEqual([1, 3, 5]);
    expect(r.date).toBeNull();
    expect(r.active).toBe(true);
  });
  it("accepts a one-off", () => {
    expect(routineSchema.safeParse({ title: "Dentist", time: "09:30", date: "2026-10-20" }).success).toBe(true);
  });
  it("rejects an invalid time", () => {
    expect(routineSchema.safeParse({ ...ok, time: "25:00" }).success).toBe(false);
    expect(routineSchema.safeParse({ ...ok, time: "6:00" }).success).toBe(false);
  });
  it("rejects both days and a date", () => {
    expect(routineSchema.safeParse({ ...ok, date: "2026-10-20" }).success).toBe(false);
  });
  it("rejects neither days nor a date", () => {
    expect(routineSchema.safeParse({ title: "x", time: "06:00" }).success).toBe(false);
  });
  it("rejects weekday 8 and a malformed date", () => {
    expect(routineSchema.safeParse({ ...ok, days: [8] }).success).toBe(false);
    expect(routineSchema.safeParse({ title: "x", time: "06:00", date: "20/10/2026" }).success).toBe(false);
  });
  it("rejects a blank title", () => {
    expect(routineSchema.safeParse({ ...ok, title: "   " }).success).toBe(false);
  });
});

describe("completionSchema", () => {
  it("requires a date and an ISO timestamp", () => {
    expect(completionSchema.safeParse({ date: "2026-10-14", completedAt: "2026-10-14T13:12:00Z" }).success).toBe(true);
    expect(completionSchema.safeParse({ date: "2026-10-14", completedAt: "yesterday" }).success).toBe(false);
  });
});

describe("routineUpdateSchema", () => {
  it("leaves fields that were not sent untouched (no defaults applied)", () => {
    expect(routineUpdateSchema.parse({ title: "New" })).toEqual({ title: "New" });
  });
  it("still validates and normalises what was sent", () => {
    expect(routineUpdateSchema.parse({ days: [3, 1] })).toEqual({ days: [1, 3] });
    expect(routineUpdateSchema.safeParse({ time: "99:99" }).success).toBe(false);
  });
});
