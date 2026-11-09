"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas } from "@/lib/utils";
import { ActionResult } from "@/types";

// ─── WeddingPlan ───────────────────────────────────────────────────────────

const planInclude = {
  events: { orderBy: { order: "asc" as const } },
  expenses: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    include: { quotes: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] } },
  },
};

export async function getWeddingPlans() {
  const userId = await getUserId();
  return prisma.weddingPlan.findMany({
    where: { userId },
    include: planInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getWeddingPlan(id: string) {
  const userId = await getUserId();
  return prisma.weddingPlan.findFirst({ where: { id, userId }, include: planInclude });
}

export async function createWeddingPlan(data: {
  brideName: string;
  groomName: string;
  weddingDate?: string;
  totalBudget?: number;
  haqMehr?: number;
  haqMehrNote?: string;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId();
    const plan = await prisma.weddingPlan.create({
      data: {
        userId,
        brideName: data.brideName,
        groomName: data.groomName,
        weddingDate: data.weddingDate ? new Date(data.weddingDate) : null,
        totalBudget: data.totalBudget ? toPaisas(data.totalBudget) : 0,
        haqMehr: data.haqMehr ? toPaisas(data.haqMehr) : null,
        haqMehrNote: data.haqMehrNote || null,
        notes: data.notes || null,
      },
    });
    revalidatePath("/wedding");
    return { success: true, data: { id: plan.id } };
  } catch (e) {
    console.error("[createWeddingPlan]", e);
    return { success: false, error: "Failed to create wedding plan" };
  }
}

export async function updateWeddingPlan(id: string, data: Partial<{
  brideName: string;
  groomName: string;
  weddingDate: string;
  totalBudget: number;
  haqMehr: number;
  haqMehrNote: string;
  notes: string;
  status: string;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.weddingPlan.updateMany({
      where: { id, userId },
      data: {
        ...data,
        weddingDate: data.weddingDate ? new Date(data.weddingDate) : undefined,
        totalBudget: data.totalBudget !== undefined ? toPaisas(data.totalBudget) : undefined,
        haqMehr: data.haqMehr !== undefined ? toPaisas(data.haqMehr) : undefined,
      },
    });
    revalidatePath("/wedding");
    revalidatePath(`/wedding/${id}`);
    return { success: true };
  } catch (e) {
    console.error("[updateWeddingPlan]", e);
    return { success: false, error: "Failed to update wedding plan" };
  }
}

export async function deleteWeddingPlan(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.weddingPlan.deleteMany({ where: { id, userId } });
    revalidatePath("/wedding");
    return { success: true };
  } catch (e) {
    console.error("[deleteWeddingPlan]", e);
    return { success: false, error: "Failed to delete wedding plan" };
  }
}

// ─── WeddingEvent ──────────────────────────────────────────────────────────

export async function createWeddingEvent(weddingPlanId: string, data: {
  type: string;
  name: string;
  date?: string;
  venue?: string;
  guestCount?: number;
  budgetAllocated?: number;
  notes?: string;
  responsibleParty?: string;
  order?: number;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const plan = await prisma.weddingPlan.findFirst({ where: { id: weddingPlanId, userId } });
    if (!plan) return { success: false, error: "Not found" };

    await prisma.weddingEvent.create({
      data: {
        weddingPlanId,
        type: data.type,
        name: data.name,
        date: data.date ? new Date(data.date) : null,
        venue: data.venue || null,
        guestCount: data.guestCount ?? null,
        budgetAllocated: data.budgetAllocated ? toPaisas(data.budgetAllocated) : 0,
        notes: data.notes || null,
        responsibleParty: data.responsibleParty ?? "JOINT",
        order: data.order ?? 0,
      },
    });
    revalidatePath(`/wedding/${weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[createWeddingEvent]", e);
    return { success: false, error: "Failed to add event" };
  }
}

export async function updateWeddingEvent(id: string, data: Partial<{
  name: string;
  date: string;
  venue: string;
  guestCount: number;
  budgetAllocated: number;
  notes: string;
  status: string;
  responsibleParty: string;
  order: number;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const event = await prisma.weddingEvent.findFirst({
      where: { id },
      select: { weddingPlan: { select: { userId: true, id: true } } },
    });
    if (!event || event.weddingPlan.userId !== userId) return { success: false, error: "Not found" };

    await prisma.weddingEvent.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        budgetAllocated: data.budgetAllocated !== undefined ? toPaisas(data.budgetAllocated) : undefined,
      },
    });
    revalidatePath(`/wedding/${event.weddingPlan.id}`);
    return { success: true };
  } catch (e) {
    console.error("[updateWeddingEvent]", e);
    return { success: false, error: "Failed to update event" };
  }
}

export async function deleteWeddingEvent(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const event = await prisma.weddingEvent.findFirst({
      where: { id },
      select: { weddingPlan: { select: { userId: true, id: true } } },
    });
    if (!event || event.weddingPlan.userId !== userId) return { success: false, error: "Not found" };

    await prisma.weddingEvent.delete({ where: { id } });
    revalidatePath(`/wedding/${event.weddingPlan.id}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteWeddingEvent]", e);
    return { success: false, error: "Failed to delete event" };
  }
}

// ─── WeddingExpense ────────────────────────────────────────────────────────
// Money in and out of these actions is in major units (rupees); stored in paisas.

type ExpenseInput = {
  name: string;
  category: string;
  eventId: string | null;
  estimated: number;
  actual: number | null;
  paid: number;
  vendorName: string | null;
  vendorPhone: string | null;
  vendorInstagram: string | null;
  notes: string | null;
};

const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

async function ownedExpense(id: string, userId: string) {
  const expense = await prisma.weddingExpense.findFirst({
    where: { id, weddingPlan: { userId } },
    select: { id: true, weddingPlanId: true, estimatedAmount: true, actualAmount: true, paidAmount: true },
  });
  return expense;
}

export async function createWeddingExpense(weddingPlanId: string, data: Partial<ExpenseInput> & { name: string }): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const plan = await prisma.weddingPlan.findFirst({ where: { id: weddingPlanId, userId }, select: { id: true } });
    if (!plan) return { success: false, error: "Not found" };
    if (!data.name.trim()) return { success: false, error: "Give the expense a name" };
    if (data.eventId) {
      const event = await prisma.weddingEvent.findFirst({ where: { id: data.eventId, weddingPlanId } });
      if (!event) return { success: false, error: "Event not found" };
    }

    await prisma.weddingExpense.create({
      data: {
        weddingPlanId,
        name: data.name.trim(),
        category: data.category ?? "MISC",
        eventId: data.eventId || null,
        estimatedAmount: data.estimated ? toPaisas(data.estimated) : 0,
        actualAmount: data.actual != null ? toPaisas(data.actual) : null,
        paidAmount: data.paid ? toPaisas(data.paid) : 0,
        vendorName: text(data.vendorName),
        vendorPhone: text(data.vendorPhone),
        vendorInstagram: text(data.vendorInstagram),
        notes: text(data.notes),
      },
    });
    revalidatePath(`/wedding/${weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[createWeddingExpense]", e);
    return { success: false, error: "Failed to add expense" };
  }
}

/** Partial edit. `actual: null` clears the real cost. A chosen quote owns the estimate and vendor. */
export async function updateWeddingExpense(id: string, data: Partial<ExpenseInput>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const expense = await ownedExpense(id, userId);
    if (!expense) return { success: false, error: "Not found" };
    if (data.name !== undefined && !data.name.trim()) return { success: false, error: "Name can't be empty" };
    if (data.eventId) {
      const event = await prisma.weddingEvent.findFirst({ where: { id: data.eventId, weddingPlanId: expense.weddingPlanId } });
      if (!event) return { success: false, error: "Event not found" };
    }

    const chosen = await prisma.weddingQuote.findFirst({ where: { expenseId: id, isChosen: true }, select: { id: true } });

    await prisma.weddingExpense.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.eventId !== undefined ? { eventId: data.eventId || null } : {}),
        // With a quote chosen, the estimate is that quote's price - change the quote instead.
        ...(data.estimated !== undefined && !chosen ? { estimatedAmount: toPaisas(data.estimated) } : {}),
        ...(data.actual !== undefined ? { actualAmount: data.actual === null ? null : toPaisas(data.actual) } : {}),
        ...(data.paid !== undefined ? { paidAmount: Math.max(0, toPaisas(data.paid)) } : {}),
        ...(data.vendorName !== undefined && !chosen ? { vendorName: text(data.vendorName) } : {}),
        ...(data.vendorPhone !== undefined && !chosen ? { vendorPhone: text(data.vendorPhone) } : {}),
        ...(data.vendorInstagram !== undefined && !chosen ? { vendorInstagram: text(data.vendorInstagram) } : {}),
        ...(data.notes !== undefined ? { notes: text(data.notes) } : {}),
      },
    });
    revalidatePath(`/wedding/${expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[updateWeddingExpense]", e);
    return { success: false, error: "Failed to update expense" };
  }
}

/** Settle in full: paid = the cost, and the cost becomes real (actual = estimate if no actual yet). */
export async function markWeddingExpensePaid(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const expense = await ownedExpense(id, userId);
    if (!expense) return { success: false, error: "Not found" };
    const cost = expense.actualAmount ?? expense.estimatedAmount;
    await prisma.weddingExpense.update({ where: { id }, data: { actualAmount: cost, paidAmount: cost } });
    revalidatePath(`/wedding/${expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[markWeddingExpensePaid]", e);
    return { success: false, error: "Failed to mark as paid" };
  }
}

export async function deleteWeddingExpense(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const expense = await ownedExpense(id, userId);
    if (!expense) return { success: false, error: "Not found" };

    await prisma.weddingExpense.delete({ where: { id } });
    revalidatePath(`/wedding/${expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteWeddingExpense]", e);
    return { success: false, error: "Failed to delete expense" };
  }
}

// ─── WeddingQuote ──────────────────────────────────────────────────────────
// Several vendors can quote one expense; choosing one sets the expense's vendor
// and estimate. At most one quote per expense is chosen.

export async function addWeddingQuote(expenseId: string, data: {
  vendorName: string; amount: number; phone?: string; instagram?: string; notes?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const expense = await ownedExpense(expenseId, userId);
    if (!expense) return { success: false, error: "Not found" };
    if (!data.vendorName.trim()) return { success: false, error: "Enter the vendor's name" };
    if (!(data.amount >= 0)) return { success: false, error: "Enter the quoted amount" };

    await prisma.weddingQuote.create({
      data: {
        expenseId,
        vendorName: data.vendorName.trim(),
        amount: toPaisas(data.amount),
        phone: text(data.phone),
        instagram: text(data.instagram),
        notes: text(data.notes),
      },
    });
    revalidatePath(`/wedding/${expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[addWeddingQuote]", e);
    return { success: false, error: "Failed to add quote" };
  }
}

async function ownedQuote(id: string, userId: string) {
  return prisma.weddingQuote.findFirst({
    where: { id, expense: { weddingPlan: { userId } } },
    include: { expense: { select: { id: true, weddingPlanId: true } } },
  });
}

export async function updateWeddingQuote(id: string, data: Partial<{
  vendorName: string; amount: number; phone: string | null; instagram: string | null; notes: string | null;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const quote = await ownedQuote(id, userId);
    if (!quote) return { success: false, error: "Not found" };
    if (data.vendorName !== undefined && !data.vendorName.trim()) return { success: false, error: "Enter the vendor's name" };

    const vendorName = data.vendorName?.trim();
    const amount = data.amount !== undefined ? toPaisas(data.amount) : undefined;
    const phone = data.phone !== undefined ? text(data.phone) : undefined;
    const instagram = data.instagram !== undefined ? text(data.instagram) : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.update({
        where: { id },
        data: {
          ...(vendorName !== undefined ? { vendorName } : {}),
          ...(amount !== undefined ? { amount } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(instagram !== undefined ? { instagram } : {}),
          ...(data.notes !== undefined ? { notes: text(data.notes) } : {}),
        },
      });
      // The chosen quote drives its expense, so edits to it carry through.
      if (quote.isChosen) {
        await tx.weddingExpense.update({
          where: { id: quote.expenseId },
          data: {
            ...(vendorName !== undefined ? { vendorName } : {}),
            ...(amount !== undefined ? { estimatedAmount: amount } : {}),
            ...(phone !== undefined ? { vendorPhone: phone } : {}),
            ...(instagram !== undefined ? { vendorInstagram: instagram } : {}),
          },
        });
      }
    });
    revalidatePath(`/wedding/${quote.expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[updateWeddingQuote]", e);
    return { success: false, error: "Failed to update quote" };
  }
}

export async function chooseWeddingQuote(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const quote = await ownedQuote(id, userId);
    if (!quote) return { success: false, error: "Not found" };

    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.updateMany({ where: { expenseId: quote.expenseId }, data: { isChosen: false } });
      await tx.weddingQuote.update({ where: { id }, data: { isChosen: true } });
      await tx.weddingExpense.update({
        where: { id: quote.expenseId },
        data: {
          vendorName: quote.vendorName,
          vendorPhone: quote.phone,
          vendorInstagram: quote.instagram,
          estimatedAmount: quote.amount,
        },
      });
    });
    revalidatePath(`/wedding/${quote.expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[chooseWeddingQuote]", e);
    return { success: false, error: "Failed to choose quote" };
  }
}

/** Un-choose: the expense keeps its estimate but is no longer tied to a vendor. */
export async function clearWeddingQuoteChoice(expenseId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const expense = await ownedExpense(expenseId, userId);
    if (!expense) return { success: false, error: "Not found" };

    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.updateMany({ where: { expenseId }, data: { isChosen: false } });
      await tx.weddingExpense.update({ where: { id: expenseId }, data: { vendorName: null, vendorPhone: null, vendorInstagram: null } });
    });
    revalidatePath(`/wedding/${expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[clearWeddingQuoteChoice]", e);
    return { success: false, error: "Failed to clear choice" };
  }
}

export async function deleteWeddingQuote(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const quote = await ownedQuote(id, userId);
    if (!quote) return { success: false, error: "Not found" };

    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.delete({ where: { id } });
      if (quote.isChosen) {
        await tx.weddingExpense.update({ where: { id: quote.expenseId }, data: { vendorName: null, vendorPhone: null, vendorInstagram: null } });
      }
    });
    revalidatePath(`/wedding/${quote.expense.weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteWeddingQuote]", e);
    return { success: false, error: "Failed to delete quote" };
  }
}
