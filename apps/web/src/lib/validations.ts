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

export const budgetSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  totalBudget: z.number().positive(),
});

export const budgetCategorySchema = z.object({
  categoryId: z.string().min(1),
  allocatedAmount: z.number().min(0),
});

export const plannerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().default("CalendarDays"),
  coverColor: z.string().default("#6366f1"),
  targetDate: z.string().optional(),
});

export const plannerItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  estimatedCost: z.number().min(0).default(0),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const savingsPotSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default("PiggyBank"),
  color: z.string().default("#3b82f6"),
  targetAmount: z.number().min(0).default(0),
  type: z.enum(["EMERGENCY", "GENERAL", "GOAL", "CUSTOM"]).default("GENERAL"),
  targetDate: z.string().optional(),
});

export const investmentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["MUTUAL_FUND", "STOCKS", "GOLD", "CRYPTO", "FIXED_DEPOSIT", "OTHER"]),
  platform: z.string().min(1).max(100),
  investedAmount: z.number().positive(),
  currentValue: z.number().min(0),
  units: z.number().optional(),
  purchaseDate: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(["DAILY", "ONE_TIME"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  recurrenceRule: z.string().optional(),
  category: z.string().optional(),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  type: z.enum(["EVENT", "REMINDER", "DEADLINE"]).default("EVENT"),
  color: z.string().optional(),
  isAllDay: z.boolean().default(true),
  reminder: z.enum(["NONE", "AT_TIME", "MIN_15", "MIN_30", "HOUR_1", "DAY_1"]).default("NONE"),
});

export const surpriseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  forWhom: z.string().min(1).max(100),
  occasion: z.string().max(100).optional(),
  targetDate: z.string().optional(),
  estimatedBudget: z.number().min(0).default(0),
});

export const surpriseItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  estimatedCost: z.number().min(0).default(0),
  purchaseLink: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  type: z.enum(["EXPENSE", "INCOME", "BOTH"]),
});

export const settingsSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3),
  dateFormat: z.string().min(1),
  firstDayOfWeek: z.number().int().min(0).max(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
