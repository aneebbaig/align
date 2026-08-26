"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas } from "@/lib/utils";
import { ActionResult } from "@/types";
import { createTransaction } from "@/actions/expenses";

export async function getPlanners() {
  const userId = await getUserId();
  return prisma.plan.findMany({
    where: { userId },
    include: { items: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getPlanner(id: string) {
  const userId = await getUserId();
  return prisma.plan.findFirst({
    where: { id, userId },
    include: {
      items: {
        orderBy: [{ eventGroup: "asc" }, { dueDate: "asc" }],
      },
    },
  });
}

export async function createPlanner(data: {
  name: string;
  description?: string;
  icon: string;
  coverColor: string;
  type?: string;
  planType?: string; // FIXED | ITEMIZED
  targetDate?: string;
  estimatedTotalCost?: number; // FIXED plans: a single target cost
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const { estimatedTotalCost, ...rest } = data;
    await prisma.plan.create({
      data: {
        ...rest,
        type: data.type ?? "GENERAL",
        planType: data.planType ?? "ITEMIZED",
        // FIXED plans carry the target directly; ITEMIZED derive it from items.
        estimatedTotalCost: data.planType === "FIXED" && estimatedTotalCost ? toPaisas(estimatedTotalCost) : 0,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        userId,
      },
    });
    revalidatePath("/plans");
    return { success: true };
  } catch (e) {
    console.error("[createPlanner]", e);
    return { success: false, error: "Failed to create plan" };
  }
}

export async function updatePlannerStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.plan.updateMany({
      where: { id, userId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
    revalidatePath("/plans");
    revalidatePath(`/plans/${id}`);
    return { success: true };
  } catch (e) {
    console.error("[updatePlannerStatus]", e);
    return { success: false, error: "Failed to update status" };
  }
}

export async function updatePlanner(id: string, data: Partial<{
  name: string; description: string; status: string; estimatedTotalCost: number;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.plan.updateMany({
      where: { id, userId },
      data: {
        ...data,
        estimatedTotalCost: data.estimatedTotalCost !== undefined ? toPaisas(data.estimatedTotalCost) : undefined,
      },
    });
    revalidatePath("/plans");
    revalidatePath(`/plans/${id}`);
    return { success: true };
  } catch (e) {
    console.error("[updatePlanner]", e);
    return { success: false, error: "Failed to update planner" };
  }
}

export async function createPlannerItem(planId: string, data: {
  name: string;
  description?: string;
  estimatedCost: number;
  dueDate?: string;
  notes?: string;
  eventGroup?: string;
  vendor?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const planner = await prisma.plan.findFirst({ where: { id: planId, userId } });
    if (!planner) return { success: false, error: "Not found" };

    await prisma.planItem.create({
      data: {
        ...data,
        estimatedCost: toPaisas(data.estimatedCost),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        planId,
      },
    });
    revalidatePath(`/plans/${planId}`);
    return { success: true };
  } catch (e) {
    console.error("[createPlannerItem]", e);
    return { success: false, error: "Failed to add item" };
  }
}

export async function updatePlannerItem(id: string, data: Partial<{
  name: string; status: string; actualCost: number; notes: string; vendor: string; eventGroup: string;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const item = await prisma.planItem.findFirst({
      where: { id },
      select: { plan: { select: { userId: true } } },
    });
    if (!item || item.plan.userId !== userId) return { success: false, error: "Not found" };

    await prisma.planItem.update({
      where: { id },
      data: {
        ...data,
        // Un-marking (back to PENDING) clears the recorded actual cost.
        actualCost: data.status === "PENDING"
          ? null
          : data.actualCost !== undefined ? toPaisas(data.actualCost) : undefined,
      },
    });
    return { success: true };
  } catch (e) {
    console.error("[updatePlannerItem]", e);
    return { success: false, error: "Failed to update item" };
  }
}

export async function deletePlannerItem(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const item = await prisma.planItem.findFirst({
      where: { id },
      select: { plan: { select: { userId: true } } },
    });
    if (!item || item.plan.userId !== userId) return { success: false, error: "Not found" };

    await prisma.planItem.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    console.error("[deletePlannerItem]", e);
    return { success: false, error: "Failed to delete item" };
  }
}

// One-tap: mark a plan item bought and book a real expense for it (the flow
// itemized goals had). Auto-provisions a "Plan Purchase" category so it stays
// a single click, and reuses createTransaction for the income/notification checks.
export async function logPlanItemExpense(itemId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const item = await prisma.planItem.findFirst({
      where: { id: itemId },
      include: { plan: { select: { userId: true, id: true } } },
    });
    if (!item || item.plan.userId !== userId) return { success: false, error: "Not found" };

    const amountPaisas = item.actualCost ?? item.estimatedCost;
    if (!amountPaisas || amountPaisas <= 0) return { success: false, error: "Set a cost for this item first" };

    const category = await prisma.category.findFirst({ where: { userId, name: "Plan Purchase", type: "EXPENSE" } })
      ?? await prisma.category.create({ data: { userId, name: "Plan Purchase", type: "EXPENSE", color: "#8b5cf6", icon: "🎯" } });

    const result = await createTransaction({
      amount: amountPaisas / 100,
      type: "EXPENSE",
      categoryId: category.id,
      description: item.name,
      date: new Date().toISOString().slice(0, 10),
      isRecurring: false,
      tags: "",
      fundingSource: "INCOME",
    });
    if (!result.success) return result;

    await prisma.planItem.update({ where: { id: itemId }, data: { status: "PAID", actualCost: amountPaisas } });
    revalidatePath(`/plans/${item.plan.id}`);
    return { success: true };
  } catch (e) {
    console.error("[logPlanItemExpense]", e);
    return { success: false, error: "Failed to log expense" };
  }
}

export async function deletePlanner(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.plan.deleteMany({ where: { id, userId } });
    revalidatePath("/plans");
    return { success: true };
  } catch (e) {
    console.error("[deletePlanner]", e);
    return { success: false, error: "Failed to delete planner" };
  }
}
