import { prisma } from "@/lib/prisma";
import { addDays, dayView, isScheduledOn, stats, type DayItem, type Stats } from "./schedule";
import { hasOneKind, oneKindMessage, type CompletionInput, type RoutineInput, type RoutineUpdateInput } from "./schemas";

// All routine reads and writes, shared by the web actions and the v1 routes.
// Every call is scoped to one user.

export class RoutineError extends Error {
  constructor(message: string, public status = 422) {
    super(message);
  }
}

export interface SerializedRoutine {
  id: string;
  title: string;
  time: string;
  days: number[];
  date: string | null;
  active: boolean;
}

const select = { id: true, title: true, time: true, days: true, date: true, active: true } as const;
const MAX_STATS_DAYS = 92;

async function owned(userId: string, id: string) {
  const routine = await prisma.routine.findFirst({ where: { id, userId }, select });
  if (!routine) throw new RoutineError("Not found", 404);
  return routine;
}

export async function listRoutines(userId: string): Promise<SerializedRoutine[]> {
  return prisma.routine.findMany({ where: { userId }, orderBy: [{ time: "asc" }, { createdAt: "asc" }], select });
}

export async function createRoutine(userId: string, data: RoutineInput): Promise<string> {
  const created = await prisma.routine.create({ data: { ...data, userId }, select: { id: true } });
  return created.id;
}

export async function updateRoutine(userId: string, id: string, data: RoutineUpdateInput): Promise<void> {
  const current = await owned(userId, id);
  const merged = { days: data.days ?? current.days, date: data.date === undefined ? current.date : data.date };
  if (!hasOneKind(merged)) throw new RoutineError(oneKindMessage, 400);
  await prisma.routine.update({ where: { id }, data });
}

export async function deleteRoutine(userId: string, id: string): Promise<void> {
  const deleted = await prisma.routine.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) throw new RoutineError("Not found", 404);
}

/** Marks a routine done for a date. Idempotent: the first tick's time is kept. */
export async function setCompletion(userId: string, id: string, input: CompletionInput): Promise<void> {
  const routine = await owned(userId, id);
  if (!isScheduledOn(routine, input.date)) throw new RoutineError("Not scheduled on that date", 400);
  await prisma.routineCompletion.upsert({
    where: { routineId_date: { routineId: id, date: input.date } },
    update: {},
    create: { routineId: id, userId, date: input.date, completedAt: new Date(input.completedAt) },
  });
}

/** Un-ticks a routine. A no-op if it was never ticked. */
export async function clearCompletion(userId: string, id: string, date: string): Promise<void> {
  await prisma.routineCompletion.deleteMany({ where: { routineId: id, userId, date } });
}

export async function getDay(userId: string, date: string): Promise<DayItem[]> {
  const [routines, completions] = await Promise.all([
    prisma.routine.findMany({ where: { userId }, select }),
    prisma.routineCompletion.findMany({ where: { userId, date }, select: { routineId: true, date: true, completedAt: true } }),
  ]);
  return dayView(routines, completions, date);
}

export async function getStats(userId: string, from: string, to: string): Promise<Stats> {
  if (from > to) throw new RoutineError("'from' must not be after 'to'", 400);
  if (addDays(from, MAX_STATS_DAYS) <= to) throw new RoutineError(`Range is limited to ${MAX_STATS_DAYS} days`, 400);
  const [routines, completions] = await Promise.all([
    prisma.routine.findMany({ where: { userId }, select }),
    prisma.routineCompletion.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: { routineId: true, date: true, completedAt: true },
    }),
  ]);
  return stats(routines, completions, from, to);
}
