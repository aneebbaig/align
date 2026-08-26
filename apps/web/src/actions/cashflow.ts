"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getAuthenticatedUser, getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas, toLocalDate } from "@/lib/utils";
import { ActionResult } from "@/types";
import { buildProjectionInput, daysUntilEndOfMonth, listUpcomingDue } from "@/lib/cashflow/adapter";
import { loadAdapterInput } from "@/lib/cashflow/data-loader";
import { projectCashflow } from "@/lib/cashflow/scheduler";
import type { MonthProjection } from "@/lib/cashflow/types";
import type { UpcomingDue } from "@/lib/cashflow/adapter";

// ─── Checkpoint 1: projection ───────────────────────────────────────────────

export async function getCashflowProjection(): Promise<MonthProjection[]> {
  const user = await getAuthenticatedUser({ cashflowHorizonMonths: true });
  const horizon = (user.cashflowHorizonMonths as number | null) ?? 8;
  const data = await loadAdapterInput(user.id);
  const input = buildProjectionInput(data, new Date(), horizon);
  return projectCashflow(input);
}

// ─── Checkpoint 3: always-visible monthly summary ───────────────────────────
// "this month: X due, Y to [payee] on [date], Z left after obligations" - the
// zero-click dashboard line. X/Z come from this cycle's projection (month 1);
// the soonest concrete due date/payee is scoped to the rest of THIS calendar
// month (not the configurable lead time, which is a separate, shorter window
// used for advance warnings below).

export interface CashflowMonthSummary {
  dueTotal: number;
  leftAfterObligations: number;
  flagged: boolean;
  shortfall: number;
  soonest: UpcomingDue | null;
}

export async function getCashflowMonthSummary(): Promise<CashflowMonthSummary> {
  const user = await getAuthenticatedUser({ cashflowHorizonMonths: true });
  const horizon = (user.cashflowHorizonMonths as number | null) ?? 8;
  const anchor = new Date();
  const data = await loadAdapterInput(user.id);

  const projection = projectCashflow(buildProjectionInput(data, anchor, horizon));
  const month1 = projection[0];
  const dueThisMonth = listUpcomingDue(data, anchor, daysUntilEndOfMonth(anchor));

  return {
    dueTotal: month1?.dueTotal ?? 0,
    leftAfterObligations: month1?.leftAfterObligations ?? 0,
    flagged: month1?.flagged ?? false,
    shortfall: month1?.shortfall ?? 0,
    soonest: dueThisMonth[0] ?? null,
  };
}

// ─── Checkpoint 3: lead-time alerts (warn ahead of due dates / lump sums) ───

export async function getUpcomingDueAlerts(): Promise<UpcomingDue[]> {
  const user = await getAuthenticatedUser({ cashflowLeadTimeDays: true });
  const leadTime = (user.cashflowLeadTimeDays as number | null) ?? 3;
  const data = await loadAdapterInput(user.id);
  return listUpcomingDue(data, new Date(), leadTime);
}

// ─── Loan schedules (attach a forward plan to an existing Loan) ────────────

export async function getLoanSchedules(loanId: string) {
  const userId = await getUserId();
  return prisma.loanSchedule.findMany({
    where: { loanId, userId },
    orderBy: { startDate: "asc" },
  });
}

export async function createLoanSchedule(data: {
  loanId: string;
  kind: "LUMP_SUM" | "FIXED_INSTALLMENT";
  amount: number;
  startDate: string;
  endDate?: string;
  flexibility?: "FIXED" | "FLEXIBLE";
  priority?: number;
  slideWindowMonths?: number;
  interestRate?: number;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const loan = await prisma.loan.findFirst({ where: { id: data.loanId, userId } });
    if (!loan) return { success: false, error: "Loan not found" };

    if (data.kind === "FIXED_INSTALLMENT" && !data.endDate) {
      return { success: false, error: "Fixed installment schedules need an end date" };
    }

    await prisma.loanSchedule.create({
      data: {
        loanId: data.loanId,
        kind: data.kind,
        amount: toPaisas(data.amount),
        startDate: toLocalDate(data.startDate),
        endDate: data.endDate ? toLocalDate(data.endDate) : null,
        flexibility: data.flexibility ?? "FIXED",
        priority: data.priority ?? 0,
        slideWindowMonths: data.slideWindowMonths ?? 0,
        interestRate: data.interestRate ?? null,
        userId,
      },
    });

    revalidatePath("/loans");
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[createLoanSchedule]", e);
    return { success: false, error: "Failed to add repayment schedule" };
  }
}

export async function updateLoanSchedule(id: string, data: Partial<{
  amount: number;
  startDate: string;
  endDate: string | null;
  flexibility: "FIXED" | "FLEXIBLE";
  priority: number;
  slideWindowMonths: number;
  interestRate: number | null;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const update: Prisma.LoanScheduleUpdateInput = {};
    if (data.amount != null) update.amount = toPaisas(data.amount);
    if (data.startDate != null) update.startDate = toLocalDate(data.startDate);
    if (data.endDate !== undefined) update.endDate = data.endDate ? toLocalDate(data.endDate) : null;
    if (data.flexibility != null) update.flexibility = data.flexibility;
    if (data.priority != null) update.priority = data.priority;
    if (data.slideWindowMonths != null) update.slideWindowMonths = data.slideWindowMonths;
    if (data.interestRate !== undefined) update.interestRate = data.interestRate;

    await prisma.loanSchedule.updateMany({ where: { id, userId }, data: update });

    revalidatePath("/loans");
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[updateLoanSchedule]", e);
    return { success: false, error: "Failed to update repayment schedule" };
  }
}

export async function deleteLoanSchedule(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.loanSchedule.deleteMany({ where: { id, userId } });
    revalidatePath("/loans");
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteLoanSchedule]", e);
    return { success: false, error: "Failed to delete repayment schedule" };
  }
}

// ─── Recurring income (salary / freelance floor) ───────────────────────────

export async function getRecurringIncomes() {
  const userId = await getUserId();
  return prisma.recurringIncome.findMany({
    where: { userId },
    include: { occurrences: { select: { month: true, year: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createRecurringIncome(data: {
  label: string;
  kind: "SALARY" | "FREELANCE" | "OTHER";
  amount: number;
  variable?: boolean;
  countsTowardFloor?: boolean;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.recurringIncome.create({
      data: {
        label: data.label,
        kind: data.kind,
        amount: toPaisas(data.amount),
        variable: data.variable ?? data.kind === "FREELANCE",
        countsTowardFloor: data.countsTowardFloor ?? true,
        dayOfMonth: data.dayOfMonth ?? null,
        startDate: data.startDate ? toLocalDate(data.startDate) : new Date(),
        endDate: data.endDate ? toLocalDate(data.endDate) : null,
        userId,
      },
    });
    revalidatePath("/cashflow");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[createRecurringIncome]", e);
    return { success: false, error: "Failed to add recurring income" };
  }
}

export async function updateRecurringIncome(id: string, data: Partial<{
  label: string;
  amount: number;
  variable: boolean;
  countsTowardFloor: boolean;
  dayOfMonth: number | null;
  endDate: string | null;
  active: boolean;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const update: Prisma.RecurringIncomeUpdateInput = {};
    if (data.label != null) update.label = data.label;
    if (data.amount != null) update.amount = toPaisas(data.amount);
    if (data.variable != null) update.variable = data.variable;
    if (data.countsTowardFloor != null) update.countsTowardFloor = data.countsTowardFloor;
    if (data.dayOfMonth !== undefined) update.dayOfMonth = data.dayOfMonth;
    if (data.endDate !== undefined) update.endDate = data.endDate ? toLocalDate(data.endDate) : null;
    if (data.active != null) update.active = data.active;

    await prisma.recurringIncome.updateMany({ where: { id, userId }, data: update });
    revalidatePath("/cashflow");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[updateRecurringIncome]", e);
    return { success: false, error: "Failed to update recurring income" };
  }
}

export async function deleteRecurringIncome(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.recurringIncome.deleteMany({ where: { id, userId } });
    revalidatePath("/cashflow");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteRecurringIncome]", e);
    return { success: false, error: "Failed to delete recurring income" };
  }
}

// ─── Planned (known future one-off) expenses ───────────────────────────────

export async function getPlannedExpenses() {
  const userId = await getUserId();
  return prisma.plannedExpense.findMany({ where: { userId }, orderBy: { dueDate: "asc" } });
}

export async function createPlannedExpense(data: {
  name: string;
  amount: number;
  dueDate: string;
  flexibility?: "FIXED" | "FLEXIBLE";
  priority?: number;
  slideWindowMonths?: number;
  categoryId?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.plannedExpense.create({
      data: {
        name: data.name,
        amount: toPaisas(data.amount),
        dueDate: toLocalDate(data.dueDate),
        flexibility: data.flexibility ?? "FIXED",
        priority: data.priority ?? 0,
        slideWindowMonths: data.slideWindowMonths ?? 0,
        categoryId: data.categoryId ?? null,
        notes: data.notes ?? null,
        userId,
      },
    });
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[createPlannedExpense]", e);
    return { success: false, error: "Failed to add planned expense" };
  }
}

// "PAID" is no longer settable here - it's only reached via `createTransaction`'s
// `linkPlannedExpenseId`, which books a real ledger Transaction alongside the
// status flip. This action only handles PLANNED <-> SKIPPED (no ledger effect).
export async function updatePlannedExpenseStatus(id: string, status: "PLANNED" | "SKIPPED"): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.plannedExpense.updateMany({ where: { id, userId }, data: { status } });
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[updatePlannedExpenseStatus]", e);
    return { success: false, error: "Failed to update planned expense" };
  }
}

export async function deletePlannedExpense(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.plannedExpense.deleteMany({ where: { id, userId } });
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deletePlannedExpense]", e);
    return { success: false, error: "Failed to delete planned expense" };
  }
}

// Horizon/lead-time are edited via updateUserSettings() in actions/settings.ts,
// alongside the other shared household settings (e.g. emergencyFundMonths) -
// one settings-save path, not a parallel one.
