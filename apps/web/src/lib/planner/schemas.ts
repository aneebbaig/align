import { z } from "zod";

// Shared by the v1 routes and the web server actions so both enforce the same rules.

const month = z.number().int().min(1).max(12);
const year = z.number().int().min(2000).max(2200);

export const settingsSchema = z
  .object({
    startMonth: month.optional(),
    startYear: year.optional(),
    months: z.number().int().min(1).max(120).optional(),
    startingCashPaisas: z.number().int().optional(),
    usdRate: z.number().positive().optional(),
  })
  .refine((d) => (d.startMonth === undefined) === (d.startYear === undefined), {
    message: "Start month and year go together",
  });

export const lineSchema = z.object({
  name: z.string().trim().min(1).max(60),
  direction: z.enum(["IN", "OUT"]),
  currency: z.enum(["PKR", "USD"]),
});
export const lineUpdateSchema = lineSchema.partial();

export const orderSchema = z.object({ ids: z.array(z.string()).max(200) });

export const cellSchema = z.object({
  month,
  year,
  amount: z.number().int().min(0), // smallest unit of the line's currency
  scope: z.enum(["FROM_HERE", "THIS_MONTH"]),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  month,
  year,
  amountPaisas: z.number().int().positive(),
  note: z.string().trim().max(80).nullable().optional(),
});
export const goalUpdateSchema = goalSchema.partial();

export type SettingsInput = z.infer<typeof settingsSchema>;
export type LineInput = z.infer<typeof lineSchema>;
export type LineUpdateInput = z.infer<typeof lineUpdateSchema>;
export type CellInput = z.infer<typeof cellSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
