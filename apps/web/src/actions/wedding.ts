"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas } from "@/lib/utils";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { ActionResult } from "@/types";

// ─── WeddingPlan ───────────────────────────────────────────────────────────

export async function getWeddingPlans() {
  const userId = await getUserId();
  return prisma.weddingPlan.findMany({
    where: { userId },
    include: {
      events: { orderBy: { order: "asc" } },
      vendors: { orderBy: [{ category: "asc" }, { createdAt: "asc" }] },
      expenses: {
        orderBy: { createdAt: "asc" },
        include: { source1Currency: true, source2Currency: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWeddingPlan(id: string) {
  const userId = await getUserId();
  return prisma.weddingPlan.findFirst({
    where: { id, userId },
    include: {
      events: { orderBy: { order: "asc" } },
      vendors: { orderBy: [{ eventId: "asc" }, { category: "asc" }, { createdAt: "asc" }] },
      expenses: {
        orderBy: [{ eventId: "asc" }, { createdAt: "asc" }],
        include: { source1Currency: true, source2Currency: true },
      },
    },
  });
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

// ─── WeddingVendor ─────────────────────────────────────────────────────────

export async function createWeddingVendor(weddingPlanId: string, data: {
  category: string;
  name: string;
  eventId?: string;       // null = general vendor
  phone?: string;
  instagram?: string;
  quotedAmount?: number;
  finalAmount?: number;
  depositPaid?: number;
  paymentStatus?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const plan = await prisma.weddingPlan.findFirst({ where: { id: weddingPlanId, userId } });
    if (!plan) return { success: false, error: "Not found" };

    await prisma.weddingVendor.create({
      data: {
        weddingPlanId,
        category: data.category,
        name: data.name,
        eventId: data.eventId || null,
        phone: data.phone || null,
        instagram: data.instagram || null,
        quotedAmount: data.quotedAmount ? toPaisas(data.quotedAmount) : 0,
        finalAmount: data.finalAmount ? toPaisas(data.finalAmount) : null,
        depositPaid: data.depositPaid ? toPaisas(data.depositPaid) : null,
        paymentStatus: data.paymentStatus ?? "UNPAID",
        notes: data.notes || null,
      },
    });
    revalidatePath(`/wedding/${weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[createWeddingVendor]", e);
    return { success: false, error: "Failed to add vendor" };
  }
}

export async function updateWeddingVendor(id: string, data: Partial<{
  name: string;
  eventId: string | null;
  phone: string;
  instagram: string;
  quotedAmount: number;
  finalAmount: number;
  depositPaid: number;
  paymentStatus: string;
  isSelected: boolean;
  notes: string;
  category: string;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const vendor = await prisma.weddingVendor.findFirst({
      where: { id },
      select: { weddingPlan: { select: { userId: true, id: true } } },
    });
    if (!vendor || vendor.weddingPlan.userId !== userId) return { success: false, error: "Not found" };

    await prisma.weddingVendor.update({
      where: { id },
      data: {
        ...data,
        quotedAmount: data.quotedAmount !== undefined ? toPaisas(data.quotedAmount) : undefined,
        finalAmount: data.finalAmount !== undefined ? toPaisas(data.finalAmount) : undefined,
        depositPaid: data.depositPaid !== undefined ? toPaisas(data.depositPaid) : undefined,
      },
    });
    revalidatePath(`/wedding/${vendor.weddingPlan.id}`);
    return { success: true };
  } catch (e) {
    console.error("[updateWeddingVendor]", e);
    return { success: false, error: "Failed to update vendor" };
  }
}

export async function selectWeddingVendor(
  id: string,
  weddingPlanId: string,
  category: string,
  eventId: string | null,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const plan = await prisma.weddingPlan.findFirst({ where: { id: weddingPlanId, userId } });
    if (!plan) return { success: false, error: "Not found" };

    // Deselect all others in same event + category scope
    await prisma.weddingVendor.updateMany({
      where: { weddingPlanId, category, eventId: eventId ?? null },
      data: { isSelected: false },
    });
    await prisma.weddingVendor.update({ where: { id }, data: { isSelected: true } });
    revalidatePath(`/wedding/${weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[selectWeddingVendor]", e);
    return { success: false, error: "Failed to select vendor" };
  }
}

export async function deleteWeddingVendor(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const vendor = await prisma.weddingVendor.findFirst({
      where: { id },
      select: { weddingPlan: { select: { userId: true, id: true } } },
    });
    if (!vendor || vendor.weddingPlan.userId !== userId) return { success: false, error: "Not found" };

    await prisma.weddingVendor.delete({ where: { id } });
    revalidatePath(`/wedding/${vendor.weddingPlan.id}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteWeddingVendor]", e);
    return { success: false, error: "Failed to delete vendor" };
  }
}

// ─── WeddingExpense ────────────────────────────────────────────────────────

export async function createWeddingExpense(weddingPlanId: string, data: {
  name: string;
  category?: string;
  eventId?: string;
  source1CurrencyId?: string;
  source1Amount?: number;
  source1Paid?: number;
  source2CurrencyId?: string;
  source2Amount?: number;
  source2Paid?: number;
  isPaid?: boolean;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const plan = await prisma.weddingPlan.findFirst({ where: { id: weddingPlanId, userId } });
    if (!plan) return { success: false, error: "Not found" };

    const base = await getBaseCurrency();
    const s1 = data.source1CurrencyId ?? base.id;
    const s2 = data.source2CurrencyId ?? null;

    await prisma.weddingExpense.create({
      data: {
        weddingPlanId,
        name: data.name,
        category: data.category ?? "MISC",
        eventId: data.eventId || null,
        source1CurrencyId: s1,
        source1Amount: data.source1Amount ? Math.round(data.source1Amount * 100) : 0,
        source1Paid: data.source1Paid ? Math.round(data.source1Paid * 100) : null,
        source2CurrencyId: s2,
        source2Amount: data.source2Amount ? Math.round(data.source2Amount * 100) : null,
        source2Paid: data.source2Paid ? Math.round(data.source2Paid * 100) : null,
        isPaid: data.isPaid ?? false,
        notes: data.notes || null,
      },
    });
    revalidatePath(`/wedding/${weddingPlanId}`);
    return { success: true };
  } catch (e) {
    console.error("[createWeddingExpense]", e);
    return { success: false, error: "Failed to add expense" };
  }
}

export async function updateWeddingExpense(id: string, data: Partial<{
  name: string;
  category: string;
  eventId: string | null;
  source1CurrencyId: string;
  source1Amount: number;
  source1Paid: number | null;
  source2CurrencyId: string | null;
  source2Amount: number | null;
  source2Paid: number | null;
  isPaid: boolean;
  notes: string;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const expense = await prisma.weddingExpense.findFirst({
      where: { id },
      select: { weddingPlan: { select: { userId: true, id: true } } },
    });
    if (!expense || expense.weddingPlan.userId !== userId) return { success: false, error: "Not found" };

    const toUnits = (v: number | null | undefined) =>
      v != null ? Math.round(v * 100) : v === null ? null : undefined;

    await prisma.weddingExpense.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        eventId: data.eventId,
        isPaid: data.isPaid,
        notes: data.notes,
        source1CurrencyId: data.source1CurrencyId,
        source1Amount: data.source1Amount !== undefined ? Math.round(data.source1Amount * 100) : undefined,
        source1Paid: toUnits(data.source1Paid),
        source2CurrencyId: data.source2CurrencyId,
        source2Amount: toUnits(data.source2Amount),
        source2Paid: toUnits(data.source2Paid),
      },
    });
    revalidatePath(`/wedding/${expense.weddingPlan.id}`);
    return { success: true };
  } catch (e) {
    console.error("[updateWeddingExpense]", e);
    return { success: false, error: "Failed to update expense" };
  }
}

export async function deleteWeddingExpense(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const expense = await prisma.weddingExpense.findFirst({
      where: { id },
      select: { weddingPlan: { select: { userId: true, id: true } } },
    });
    if (!expense || expense.weddingPlan.userId !== userId) return { success: false, error: "Not found" };

    await prisma.weddingExpense.delete({ where: { id } });
    revalidatePath(`/wedding/${expense.weddingPlan.id}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteWeddingExpense]", e);
    return { success: false, error: "Failed to delete expense" };
  }
}
