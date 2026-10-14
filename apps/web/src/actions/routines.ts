"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/session";
import { addDays, todayString, type DayItem, type DayStat } from "@/lib/routines/schedule";
import { dateSchema, routineSchema, routineUpdateSchema } from "@/lib/routines/schemas";
import * as store from "@/lib/routines/store";
import { ActionResult } from "@/types";

// Web counterparts of the /api/v1/routines routes - same store, same schemas.

export interface RoutinesPage {
  date: string;
  today: string;
  routines: store.SerializedRoutine[];
  day: DayItem[];
  week: DayStat[];
  currentStreak: number;
  bestStreak: number;
}

export async function getRoutinesPage(requested?: string): Promise<RoutinesPage> {
  const userId = await getUserId();
  const today = todayString();
  const parsed = dateSchema.safeParse(requested);
  const date = parsed.success ? parsed.data : today;
  const [routines, day, stats] = await Promise.all([
    store.listRoutines(userId),
    store.getDay(userId, date),
    // 60 days so the streaks have room to run; the strip shows the last 7.
    store.getStats(userId, addDays(date, -59), date),
  ]);
  return { date, today, routines, day, week: stats.days.slice(-7), currentStreak: stats.currentStreak, bestStreak: stats.bestStreak };
}

async function run(fn: (userId: string) => Promise<string | void>, parse?: () => void): Promise<ActionResult & { id?: string }> {
  try {
    parse?.();
    const id = await fn(await getUserId());
    revalidatePath("/routines");
    return { success: true, ...(id ? { id } : {}) };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0]?.message ?? "Invalid input" };
    if (e instanceof store.RoutineError) return { success: false, error: e.message };
    console.error("[routines action]", e);
    return { success: false, error: "Something went wrong" };
  }
}

export async function addRoutine(raw: unknown) {
  return run(async (u) => store.createRoutine(u, routineSchema.parse(raw)));
}

export async function editRoutine(id: string, raw: unknown) {
  return run(async (u) => store.updateRoutine(u, id, routineUpdateSchema.parse(raw)));
}

export async function removeRoutine(id: string) {
  return run((u) => store.deleteRoutine(u, id));
}

export async function tickRoutine(id: string, date: string) {
  return run((u) => store.setCompletion(u, id, { date: dateSchema.parse(date), completedAt: new Date().toISOString() }));
}

export async function untickRoutine(id: string, date: string) {
  return run((u) => store.clearCompletion(u, id, dateSchema.parse(date)));
}
