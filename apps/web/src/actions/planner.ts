"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/session";
import {
  cellSchema, goalSchema, goalUpdateSchema, lineSchema, lineUpdateSchema, orderSchema, settingsSchema,
} from "@/lib/planner/schemas";
import * as store from "@/lib/planner/store";
import { ActionResult } from "@/types";

// Web counterparts of the /api/v1/planner routes - same store, same schemas.

export async function getPlanner(): Promise<store.SerializedPlanner> {
  return store.getPlanner(await getUserId());
}

async function run<S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown,
  fn: (userId: string, data: z.infer<S>) => Promise<string | void>,
): Promise<ActionResult & { id?: string }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const id = await fn(await getUserId(), parsed.data);
    revalidatePath("/planner");
    return { success: true, ...(id ? { id } : {}) };
  } catch (e) {
    if (e instanceof store.PlannerError) return { success: false, error: e.message };
    console.error("[planner action]", e);
    return { success: false, error: "Something went wrong" };
  }
}

export async function plannerUpdateSettings(raw: unknown) {
  return run(settingsSchema, raw, (u, d) => store.updateSettings(u, d));
}
export async function plannerAddLine(raw: unknown) {
  return run(lineSchema, raw, (u, d) => store.addLine(u, d));
}
export async function plannerUpdateLine(id: string, raw: unknown) {
  return run(lineUpdateSchema, raw, (u, d) => store.updateLine(u, id, d));
}
export async function plannerDeleteLine(id: string) {
  return run(z.object({}), {}, (u) => store.deleteLine(u, id));
}
export async function plannerReorderLines(raw: unknown) {
  return run(orderSchema, raw, (u, d) => store.reorderLines(u, d.ids));
}
export async function plannerSetCell(lineId: string, raw: unknown) {
  return run(cellSchema, raw, (u, d) => store.setCell(u, lineId, d));
}
export async function plannerRemoveOverride(lineId: string, raw: unknown) {
  return run(cellSchema.pick({ month: true, year: true }), raw, (u, d) => store.removeOverride(u, lineId, d.month, d.year));
}
export async function plannerAddGoal(raw: unknown) {
  return run(goalSchema, raw, (u, d) => store.addGoal(u, d));
}
export async function plannerUpdateGoal(id: string, raw: unknown) {
  return run(goalUpdateSchema, raw, (u, d) => store.updateGoal(u, id, d));
}
export async function plannerDeleteGoal(id: string) {
  return run(z.object({}), {}, (u) => store.deleteGoal(u, id));
}
