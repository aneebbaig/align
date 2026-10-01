import { prisma } from "@/lib/prisma";
import { computePlannerTable, type Direction, type PlannerCurrency, type PlannerInput } from "./compute";
import { currentMonthKey, monthKeyToParts, toMonthKey } from "./months";
import type { CellInput, GoalInput, GoalUpdateInput, LineInput, LineUpdateInput, SettingsInput } from "./schemas";

// All planner reads and writes, shared by the web actions and the v1 routes.
// Every call is scoped to one user's planner.

export class PlannerError extends Error {
  constructor(message: string, public status = 422) {
    super(message);
  }
}

export interface SerializedPlanner {
  settings: { startMonth: number; startYear: number; months: number; startingCashPaisas: number; usdRate: number };
  lines: {
    id: string;
    name: string;
    direction: Direction;
    currency: PlannerCurrency;
    order: number;
    steps: { month: number; year: number; amount: number }[];
    overrides: { month: number; year: number; amount: number }[];
  }[];
  goals: { id: string; name: string; month: number; year: number; amountPaisas: number; note: string | null; order: number }[];
  rows: {
    month: number;
    year: number;
    cells: { lineId: string; native: number; pkr: number; signed: number; isOverride: boolean }[];
    goals: { id: string; name: string; amountPaisas: number; note: string | null }[];
    goalsTotal: number;
    net: number;
    available: number;
  }[];
}

// The planner's own USD rate starts as a copy of the real one (or 278).
async function defaultUsdRate(): Promise<number> {
  const usd = await prisma.currency.findUnique({ where: { code: "USD" }, select: { rateToBase: true, isBase: true } });
  return usd && !usd.isBase && usd.rateToBase > 0 ? usd.rateToBase : 278;
}

async function ensureSettings(userId: string) {
  const existing = await prisma.plannerSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  const usdRate = await defaultUsdRate();
  return prisma.plannerSettings.upsert({
    where: { userId },
    update: {},
    create: { userId, startMonthKey: currentMonthKey(), usdRate },
  });
}

const withParts = (r: { monthKey: number; amount: number }) => ({ ...monthKeyToParts(r.monthKey), amount: r.amount });

export async function getPlanner(userId: string): Promise<SerializedPlanner> {
  const settings = await ensureSettings(userId);
  const [lines, goals] = await Promise.all([
    prisma.plannerLine.findMany({
      where: { userId },
      include: { steps: { orderBy: { monthKey: "asc" } }, overrides: { orderBy: { monthKey: "asc" } } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.plannerGoal.findMany({ where: { userId }, orderBy: [{ monthKey: "asc" }, { order: "asc" }, { createdAt: "asc" }] }),
  ]);

  const input: PlannerInput = {
    startMonthKey: settings.startMonthKey,
    months: settings.months,
    startingCash: settings.startingCash,
    usdRate: settings.usdRate,
    lines: lines.map((l) => ({
      id: l.id,
      name: l.name,
      direction: l.direction as Direction,
      currency: l.currency as PlannerCurrency,
      order: l.order,
      steps: l.steps.map((s) => ({ monthKey: s.monthKey, amount: s.amount })),
      overrides: l.overrides.map((o) => ({ monthKey: o.monthKey, amount: o.amount })),
    })),
    goals: goals.map((g) => ({ id: g.id, name: g.name, monthKey: g.monthKey, amount: g.amount, note: g.note, order: g.order })),
  };
  const start = monthKeyToParts(settings.startMonthKey);

  return {
    settings: { startMonth: start.month, startYear: start.year, months: settings.months, startingCashPaisas: settings.startingCash, usdRate: settings.usdRate },
    lines: input.lines.map((l) => ({ ...l, steps: l.steps.map(withParts), overrides: l.overrides.map(withParts) })),
    goals: input.goals.map((g) => ({ id: g.id, name: g.name, ...monthKeyToParts(g.monthKey), amountPaisas: g.amount, note: g.note, order: g.order })),
    rows: computePlannerTable(input).map((r) => ({
      month: r.month,
      year: r.year,
      cells: r.cells,
      goals: r.goals.map((g) => ({ id: g.id, name: g.name, amountPaisas: g.amount, note: g.note })),
      goalsTotal: r.goalsTotal,
      net: r.net,
      available: r.available,
    })),
  };
}

export async function updateSettings(userId: string, d: SettingsInput): Promise<void> {
  await ensureSettings(userId);
  await prisma.plannerSettings.update({
    where: { userId },
    data: {
      ...(d.startMonth !== undefined && d.startYear !== undefined ? { startMonthKey: toMonthKey(d.startMonth, d.startYear) } : {}),
      ...(d.months !== undefined ? { months: d.months } : {}),
      ...(d.startingCashPaisas !== undefined ? { startingCash: d.startingCashPaisas } : {}),
      ...(d.usdRate !== undefined ? { usdRate: d.usdRate } : {}),
    },
  });
}

async function ownLine(userId: string, id: string) {
  const line = await prisma.plannerLine.findFirst({ where: { id, userId }, select: { id: true } });
  if (!line) throw new PlannerError("Line not found", 404);
  return line;
}

async function ownGoal(userId: string, id: string) {
  const goal = await prisma.plannerGoal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!goal) throw new PlannerError("Goal not found", 404);
  return goal;
}

export async function addLine(userId: string, d: LineInput): Promise<string> {
  const last = await prisma.plannerLine.findFirst({ where: { userId }, orderBy: { order: "desc" }, select: { order: true } });
  const line = await prisma.plannerLine.create({
    data: { userId, name: d.name, direction: d.direction, currency: d.currency, order: (last?.order ?? 0) + 1 },
    select: { id: true },
  });
  return line.id;
}

export async function updateLine(userId: string, id: string, d: LineUpdateInput): Promise<void> {
  await ownLine(userId, id);
  await prisma.plannerLine.update({ where: { id }, data: d });
}

export async function deleteLine(userId: string, id: string): Promise<void> {
  await ownLine(userId, id);
  await prisma.plannerLine.delete({ where: { id } }); // steps and overrides cascade
}

export async function reorderLines(userId: string, ids: string[]): Promise<void> {
  const owned = await prisma.plannerLine.findMany({ where: { userId }, select: { id: true } });
  const ownedIds = new Set(owned.map((l) => l.id));
  if (ids.length !== ownedIds.size || !ids.every((id) => ownedIds.has(id))) {
    throw new PlannerError("Order must list every line exactly once");
  }
  await prisma.$transaction(ids.map((id, i) => prisma.plannerLine.update({ where: { id }, data: { order: i + 1 } })));
}

// "From this month on" writes a step and clears that month's override (the
// typed value is what the user wants to see there); "Just this month" writes
// an override.
export async function setCell(userId: string, lineId: string, d: CellInput): Promise<void> {
  await ownLine(userId, lineId);
  const monthKey = toMonthKey(d.month, d.year);
  const where = { lineId_monthKey: { lineId, monthKey } };
  if (d.scope === "FROM_HERE") {
    await prisma.$transaction([
      prisma.plannerStep.upsert({ where, update: { amount: d.amount }, create: { lineId, monthKey, amount: d.amount } }),
      prisma.plannerOverride.deleteMany({ where: { lineId, monthKey } }),
    ]);
  } else {
    await prisma.plannerOverride.upsert({ where, update: { amount: d.amount }, create: { lineId, monthKey, amount: d.amount } });
  }
}

export async function removeOverride(userId: string, lineId: string, month: number, year: number): Promise<void> {
  await ownLine(userId, lineId);
  await prisma.plannerOverride.deleteMany({ where: { lineId, monthKey: toMonthKey(month, year) } });
}

export async function addGoal(userId: string, d: GoalInput): Promise<string> {
  const monthKey = toMonthKey(d.month, d.year);
  const last = await prisma.plannerGoal.findFirst({ where: { userId, monthKey }, orderBy: { order: "desc" }, select: { order: true } });
  const goal = await prisma.plannerGoal.create({
    data: { userId, name: d.name, monthKey, amount: d.amountPaisas, note: d.note ?? null, order: (last?.order ?? 0) + 1 },
    select: { id: true },
  });
  return goal.id;
}

export async function updateGoal(userId: string, id: string, d: GoalUpdateInput): Promise<void> {
  await ownGoal(userId, id);
  if ((d.month === undefined) !== (d.year === undefined)) throw new PlannerError("Month and year go together");
  await prisma.plannerGoal.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.month !== undefined && d.year !== undefined ? { monthKey: toMonthKey(d.month, d.year) } : {}),
      ...(d.amountPaisas !== undefined ? { amount: d.amountPaisas } : {}),
      ...(d.note !== undefined ? { note: d.note } : {}),
    },
  });
}

export async function deleteGoal(userId: string, id: string): Promise<void> {
  await ownGoal(userId, id);
  await prisma.plannerGoal.delete({ where: { id } });
}
