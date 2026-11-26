// Rolling carry-over of unspent income between budget periods (base currency).
// A period's key is year * 12 + (month - 1). `net` is what a period left over
// on its own: income - income-funded expenses - income deposits into pots.
// A period that ended below zero carries nothing forward (its carry-out is
// clamped at 0), so an old overspend never drags later periods down.

export type PeriodNet = { key: number; net: number };

export function periodKey(p: { month: number; year: number }): number {
  return p.year * 12 + (p.month - 1);
}

type Step = { key: number; carry: number; run: number };

/** Ordered periods (nets summed per key, plus `extraKeys`) with carry and running total. */
function runs(nets: PeriodNet[], extraKeys: number[] = []): Step[] {
  const byKey = new Map<number, number>();
  for (const n of nets) byKey.set(n.key, (byKey.get(n.key) ?? 0) + n.net);
  for (const k of extraKeys) if (!byKey.has(k)) byKey.set(k, 0);
  const steps: Step[] = [];
  let prevRun = 0;
  for (const key of [...byKey.keys()].sort((a, b) => a - b)) {
    const carry = steps.length === 0 ? 0 : Math.max(0, prevRun);
    const run = carry + (byKey.get(key) ?? 0);
    steps.push({ key, carry, run });
    prevRun = run;
  }
  return steps;
}

export function computeCarry(
  nets: PeriodNet[],
  period: { month: number; year: number },
): { carryIn: number; available: number; cumulativeAtPeriod: number } {
  const key = periodKey(period);
  const steps = runs(nets, [key]);
  const idx = steps.findIndex((s) => s.key === key);
  const at = steps[idx];
  let available = Math.max(0, at.run);
  for (const q of steps.slice(idx + 1)) {
    if (q.run < 0) break;
    available = Math.min(available, q.run);
  }
  return { carryIn: at.carry, available, cumulativeAtPeriod: at.run };
}

/**
 * How far an income change pushes any period (from `fromKey` on) below zero,
 * beyond where it already was. 0 means the change is allowed.
 */
export function incomeChangeDeficit(before: PeriodNet[], after: PeriodNet[], fromKey: number): number {
  const keys = [...new Set([...before, ...after].map((n) => n.key))];
  const b = new Map(runs(before, keys).map((s) => [s.key, s.run]));
  const a = new Map(runs(after, keys).map((s) => [s.key, s.run]));
  let worst = 0;
  for (const k of keys) {
    if (k < fromKey) continue;
    worst = Math.max(worst, Math.min(0, b.get(k) ?? 0) - (a.get(k) ?? 0));
  }
  return worst;
}
