"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas } from "@/lib/utils";
import { getCurrentPeriod } from "@/lib/month";
import { ActionResult } from "@/types";

export async function getWantList() {
  const userId = await getUserId();
  const items = await prisma.wantListItem.findMany({
    where: { userId, status: "WAITING" },
    orderBy: { addedAt: "desc" },
  });

  const now = new Date();
  const cooling = items.filter((i) => i.remindAt > now);
  const resurface = items.filter((i) => i.remindAt <= now);

  return { cooling, resurface };
}

export async function getWantListHistory() {
  const userId = await getUserId();
  return prisma.wantListItem.findMany({
    where: { userId, status: { not: "WAITING" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function addToWantList(data: {
  name: string;
  description?: string;
  estimatedCost?: number;
  url?: string;
  categoryHint?: string;
  coolingHours?: number;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const hours = data.coolingHours ?? 48;
    const remindAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const estimatedCost = data.estimatedCost ? toPaisas(data.estimatedCost) : null;

    await prisma.wantListItem.create({
      data: {
        name: data.name,
        description: data.description,
        estimatedCost,
        url: data.url,
        categoryHint: data.categoryHint,
        remindAt,
        userId,
      },
    });

    revalidatePath("/want-list");
    return { success: true };
  } catch (e) {
    console.error("[addToWantList]", e);
    return { success: false, error: "Failed to add item" };
  }
}

export async function dismissWantListItem(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.wantListItem.updateMany({
      where: { id, userId },
      data: { status: "DISMISSED" },
    });
    revalidatePath("/want-list");
    return { success: true };
  } catch (e) {
    console.error("[dismissWantListItem]", e);
    return { success: false, error: "Failed to dismiss item" };
  }
}

export async function buyWantListItem(id: string, data: {
  categoryId: string;
  actualAmount?: number;
  date?: string;
}): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = user.id;
    const { month, year } = getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    const item = await prisma.wantListItem.findFirst({ where: { id, userId } });
    if (!item) return { success: false, error: "Item not found" };

    const amount = data.actualAmount
      ? toPaisas(data.actualAmount)
      : (item.estimatedCost ?? 0);

    await prisma.$transaction([
      prisma.wantListItem.update({
        where: { id },
        data: { status: "BOUGHT", boughtAt: new Date() },
      }),
      prisma.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          categoryId: data.categoryId,
          description: item.name,
          notes: item.description ?? undefined,
          date: data.date ? new Date(data.date) : new Date(),
          budgetMonth: month,
          budgetYear: year,
          userId,
        },
      }),
    ]);

    revalidatePath("/want-list");
    revalidatePath("/expenses");
    return { success: true };
  } catch (e) {
    console.error("[buyWantListItem]", e);
    return { success: false, error: "Failed to mark as bought" };
  }
}

export async function snoozeWantListItem(id: string, hours: number): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const remindAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    await prisma.wantListItem.updateMany({
      where: { id, userId },
      data: { remindAt },
    });
    revalidatePath("/want-list");
    return { success: true };
  } catch (e) {
    console.error("[snoozeWantListItem]", e);
    return { success: false, error: "Failed to snooze item" };
  }
}

export async function deleteWantListItem(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.wantListItem.deleteMany({ where: { id, userId } });
    revalidatePath("/want-list");
    return { success: true };
  } catch (e) {
    console.error("[deleteWantListItem]", e);
    return { success: false, error: "Failed to delete item" };
  }
}
