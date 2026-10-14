import { APP_TIME_ZONE, dayNumber } from "../day";

// What a routine schedules and how a day went. Pure: both the API routes and
// the web actions feed it rows and serialise what comes back. Dates are
// "YYYY-MM-DD" strings (calendar days in the household timezone); weekdays are
// ISO (Monday = 1 ... Sunday = 7).

export interface RoutineLike {
  id: string;
  title: string;
  time: string; // "HH:mm"
  days: number[]; // empty = one-off
  date: string | null; // one-offs only
  active: boolean;
}

export interface CompletionLike {
  routineId: string;
  date: string;
  completedAt: Date;
}

export interface DayItem {
  routineId: string;
  title: string;
  time: string;
  done: boolean;
  completedAt: string | null;
  /** Minutes between the scheduled time and the tick (negative = early). */
  deltaMinutes: number | null;
}

export interface DayStat {
  date: string;
  scheduled: number;
  done: number;
}

export interface Stats {
  days: DayStat[];
  currentStreak: number;
  bestStreak: number;
}

const parts = (date: string) => date.split("-").map(Number) as [number, number, number];

export function addDays(date: string, n: number): string {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function isoWeekday(date: string): number {
  const [y, m, d] = parts(date);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return w === 0 ? 7 : w;
}

export function isScheduledOn(r: RoutineLike, date: string): boolean {
  if (!r.active) return false;
  return r.days.length > 0 ? r.days.includes(isoWeekday(date)) : r.date === date;
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function localMinutes(d: Date, timeZone: string): number {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const n = (type: string) => Number(p.find((x) => x.type === type)?.value);
  return n("hour") * 60 + n("minute");
}

const dateNumber = (date: string) => {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

export function dayView(
  routines: RoutineLike[],
  completions: CompletionLike[],
  date: string,
  timeZone: string = APP_TIME_ZONE,
): DayItem[] {
  const doneBy = new Map(completions.filter((c) => c.date === date).map((c) => [c.routineId, c.completedAt]));
  return routines
    .filter((r) => isScheduledOn(r, date))
    .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
    .map((r) => {
      const at = doneBy.get(r.id);
      return {
        routineId: r.id,
        title: r.title,
        time: r.time,
        done: !!at,
        completedAt: at ? at.toISOString() : null,
        deltaMinutes: at
          ? (dayNumber(at, timeZone) - dateNumber(date)) * 1440 + localMinutes(at, timeZone) - minutesOf(r.time)
          : null,
      };
    });
}

export function stats(routines: RoutineLike[], completions: CompletionLike[], from: string, to: string): Stats {
  const days: DayStat[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const scheduled = routines.filter((r) => isScheduledOn(r, d));
    const ids = new Set(scheduled.map((r) => r.id));
    const done = new Set(completions.filter((c) => c.date === d && ids.has(c.routineId)).map((c) => c.routineId)).size;
    days.push({ date: d, scheduled: scheduled.length, done });
  }

  // Streaks run over days that had something scheduled. The last day of the
  // range is still in progress if unfinished, so it never breaks the streak.
  const seq = days.filter((d) => d.scheduled > 0).map((d) => ({ date: d.date, complete: d.done === d.scheduled }));
  let best = 0;
  let run = 0;
  for (const s of seq) {
    run = s.complete ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const settled = seq.length > 0 && seq[seq.length - 1].date === to && !seq[seq.length - 1].complete ? seq.slice(0, -1) : seq;
  let current = 0;
  for (let i = settled.length - 1; i >= 0 && settled[i].complete; i--) current++;

  return { days, currentStreak: current, bestStreak: best };
}
