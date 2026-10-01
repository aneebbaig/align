import { describe, expect, it } from "vitest";
import { cellSchema, goalSchema, settingsSchema } from "./schemas";

const MAX = 2_147_483_647; // Postgres INTEGER - the column type for every planner amount

describe("planner amount limits", () => {
  it("accepts amounts up to the database limit", () => {
    expect(goalSchema.safeParse({ name: "Plot", month: 1, year: 2027, amountPaisas: MAX }).success).toBe(true);
    expect(cellSchema.safeParse({ month: 1, year: 2027, amount: MAX, scope: "FROM_HERE" }).success).toBe(true);
    expect(settingsSchema.safeParse({ startingCashPaisas: -MAX }).success).toBe(true);
  });

  it("refuses bigger amounts with a message a person can act on", () => {
    const goal = goalSchema.safeParse({ name: "Plot", month: 1, year: 2027, amountPaisas: MAX + 1 });
    const cell = cellSchema.safeParse({ month: 1, year: 2027, amount: MAX + 1, scope: "FROM_HERE" });
    const cash = settingsSchema.safeParse({ startingCashPaisas: -(MAX + 1) });
    for (const r of [goal, cell, cash]) {
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("Amount is too large (max Rs 21,474,836)");
    }
  });
});
