import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(200),
  notes: z.string().max(1000).optional(),
  date: z.string().min(1, "Date is required"),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  tags: z.string().default(""),
  isRegretPurchase: z.boolean().default(false),
});

export const settingsSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3),
  dateFormat: z.string().min(1),
  firstDayOfWeek: z.number().int().min(0).max(1),
});
