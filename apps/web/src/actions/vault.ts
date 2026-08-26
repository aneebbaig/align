"use server";

// PRIVACY CRITICAL: All queries MUST filter by session userId. Never return another user's data.

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas } from "@/lib/utils";
import { ActionResult } from "@/types";

export async function getSurprises() {
  const userId = await getUserId();
  return prisma.surprise.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSurprise(id: string) {
  const userId = await getUserId();
  return prisma.surprise.findFirst({
    where: { id, userId },
    include: { items: true },
  });
}

export async function createSurprise(data: {
  name: string;
  description?: string;
  forWhom: string;
  occasion?: string;
  targetDate?: string;
  estimatedBudget: number;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.surprise.create({
      data: {
        ...data,
        estimatedBudget: toPaisas(data.estimatedBudget),
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        userId,
      },
    });
    revalidatePath("/vault");
    return { success: true };
  } catch (e) {
    console.error("[createSurprise]", e);
    return { success: false, error: "Failed to create surprise" };
  }
}

export async function updateSurprise(id: string, data: Partial<{
  name: string; description: string; status: string; estimatedBudget: number;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.surprise.updateMany({
      where: { id, userId },
      data: {
        ...data,
        estimatedBudget: data.estimatedBudget !== undefined ? toPaisas(data.estimatedBudget) : undefined,
      },
    });
    revalidatePath("/vault");
    revalidatePath(`/vault/${id}`);
    return { success: true };
  } catch (e) {
    console.error("[updateSurprise]", e);
    return { success: false, error: "Failed to update surprise" };
  }
}

async function recalcActualSpent(surpriseId: string) {
  const items = await prisma.surpriseItem.findMany({ where: { surpriseId } });
  const actualSpent = items.reduce((sum, item) => sum + (item.actualCost ?? item.estimatedCost), 0);
  await prisma.surprise.update({ where: { id: surpriseId }, data: { actualSpent } });
}

export async function createSurpriseItem(surpriseId: string, data: {
  name: string;
  description?: string;
  estimatedCost: number;
  purchaseLink?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const surprise = await prisma.surprise.findFirst({ where: { id: surpriseId, userId } });
    if (!surprise) return { success: false, error: "Not found" };

    await prisma.surpriseItem.create({
      data: { ...data, estimatedCost: toPaisas(data.estimatedCost), surpriseId },
    });

    await recalcActualSpent(surpriseId);
    revalidatePath("/vault");
    revalidatePath(`/vault/${surpriseId}`);
    return { success: true };
  } catch (e) {
    console.error("[createSurpriseItem]", e);
    return { success: false, error: "Failed to add item" };
  }
}

export async function updateSurpriseItem(surpriseId: string, itemId: string, data: Partial<{
  name: string; status: string; estimatedCost: number; actualCost: number; purchaseLink: string; notes: string;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const surprise = await prisma.surprise.findFirst({ where: { id: surpriseId, userId } });
    if (!surprise) return { success: false, error: "Not found" };

    await prisma.surpriseItem.update({
      where: { id: itemId },
      data: {
        ...data,
        estimatedCost: data.estimatedCost !== undefined ? toPaisas(data.estimatedCost) : undefined,
        actualCost: data.actualCost !== undefined ? toPaisas(data.actualCost) : undefined,
      },
    });

    await recalcActualSpent(surpriseId);
    revalidatePath("/vault");
    revalidatePath(`/vault/${surpriseId}`);
    return { success: true };
  } catch (e) {
    console.error("[updateSurpriseItem]", e);
    return { success: false, error: "Failed to update item" };
  }
}

export async function deleteSurpriseItem(surpriseId: string, itemId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const surprise = await prisma.surprise.findFirst({ where: { id: surpriseId, userId } });
    if (!surprise) return { success: false, error: "Not found" };

    await prisma.surpriseItem.delete({ where: { id: itemId } });
    await recalcActualSpent(surpriseId);
    revalidatePath("/vault");
    revalidatePath(`/vault/${surpriseId}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteSurpriseItem]", e);
    return { success: false, error: "Failed to delete item" };
  }
}

export async function deleteSurprise(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.surprise.deleteMany({ where: { id, userId } });
    revalidatePath("/vault");
    return { success: true };
  } catch (e) {
    console.error("[deleteSurprise]", e);
    return { success: false, error: "Failed to delete surprise" };
  }
}
