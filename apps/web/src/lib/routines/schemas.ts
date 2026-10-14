import { z } from "zod";

// Shared by the v1 routes and the web server actions so both enforce the same rules.

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const title = z.string().trim().min(1, "Title is required").max(100);
const days = z
  .array(z.number().int().min(1, "Weekdays are 1-7").max(7, "Weekdays are 1-7"))
  .transform((d) => [...new Set(d)].sort((a, b) => a - b));

const base = z.object({
  title,
  time,
  days: days.default([]),
  date: date.nullable().default(null),
  active: z.boolean().default(true),
});

/** A routine repeats on weekdays or happens once on a date - exactly one of the two. */
export const hasOneKind = (v: { days: number[]; date: string | null }) => (v.days.length > 0) !== (v.date !== null);
const oneKindMessage = "Pick weekdays or a date, not both";

export const routineSchema = base.refine(hasOneKind, oneKindMessage);
// Partial: the store checks the merged record against `hasOneKind`.
// Built without defaults: Zod 4 would apply them to omitted fields and a PATCH
// of just the title would reset days and active.
export const routineUpdateSchema = z.object({
  title: title.optional(),
  time: time.optional(),
  days: days.optional(),
  date: date.nullable().optional(),
  active: z.boolean().optional(),
});
export const completionSchema = z.object({ date, completedAt: z.string().datetime() });
export const dateSchema = date;

export type RoutineInput = z.infer<typeof routineSchema>;
export type RoutineUpdateInput = z.infer<typeof routineUpdateSchema>;
export type CompletionInput = z.infer<typeof completionSchema>;
export { oneKindMessage };
