import { monthKeyToParts } from "./months";

// The planner table, built fresh from its inputs every time - nothing computed
// is stored, so it can't go stale. Pure: no DB, no dates beyond month keys.

export type Direction = "IN" | "OUT";
export type PlannerCurrency = "PKR" | "USD";

interface MonthAmount {
  monthKey: number;
  amount: number; // smallest unit of the line's currency, >= 0
}

export interface PlannerInputLine {
  id: string;
  name: string;
  direction: Direction;
  currency: PlannerCurrency;
  order: number;
  steps: MonthAmount[]; // "from this month on"
  overrides: MonthAmount[]; // "this month only"
}

export interface PlannerInputGoal {
  id: string;
  name: string;
  monthKey: number;
  amount: number; // paisas, > 0
  note: string | null;
  order: number;
}

export interface PlannerInput {
  startMonthKey: number;
  months: number;
  startingCash: number; // paisas
  usdRate: number; // PKR per USD
  lines: PlannerInputLine[];
  goals: PlannerInputGoal[];
}

export interface PlannerCell {
  lineId: string;
  native: number; // in the line's own currency unit
  pkr: number; // paisas
  signed: number; // +pkr for IN, -pkr for OUT
  isOverride: boolean;
}

export interface PlannerRow {
  monthKey: number;
  month: number;
  year: number;
  cells: PlannerCell[];
  goals: PlannerInputGoal[];
  goalsTotal: number;
  net: number; // money in - money out, before goals
  available: number; // running balance after goals
}

export function lineAmountAt(line: PlannerInputLine, monthKey: number): { native: number; isOverride: boolean } {
  const override = line.overrides.find((o) => o.monthKey === monthKey);
  if (override) return { native: override.amount, isOverride: true };
  let best: MonthAmount | null = null;
  for (const step of line.steps) {
    if (step.monthKey <= monthKey && (!best || step.monthKey > best.monthKey)) best = step;
  }
  return { native: best?.amount ?? 0, isOverride: false };
}

export function computePlannerTable(input: PlannerInput): PlannerRow[] {
  const lines = [...input.lines].sort((a, b) => a.order - b.order);
  const rows: PlannerRow[] = [];
  let available = input.startingCash;

  for (let i = 0; i < input.months; i++) {
    const monthKey = input.startMonthKey + i;
    const cells = lines.map((line): PlannerCell => {
      const { native, isOverride } = lineAmountAt(line, monthKey);
      const pkr = line.currency === "USD" ? Math.round(native * input.usdRate) : native;
      // 0 - pkr (not -pkr) so an empty OUT line is 0, never -0.
      return { lineId: line.id, native, pkr, signed: line.direction === "IN" ? pkr : 0 - pkr, isOverride };
    });
    const net = cells.reduce((sum, c) => sum + c.signed, 0);
    const goals = input.goals.filter((g) => g.monthKey === monthKey).sort((a, b) => a.order - b.order);
    const goalsTotal = goals.reduce((sum, g) => sum + g.amount, 0);
    available = available + net - goalsTotal;
    rows.push({ monthKey, ...monthKeyToParts(monthKey), cells, goals, goalsTotal, net, available });
  }
  return rows;
}
