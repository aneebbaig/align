"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas } from "@/lib/utils";
import { getCurrentPeriod } from "@/lib/month";
import { ActionResult } from "@/types";

export async function getNeedList() {
  const userId = await getUserId();
  return prisma.needListItem.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { addedAt: "asc" },
  });
}

export async function getNeedListHistory() {
  const userId = await getUserId();
  return prisma.needListItem.findMany({
    where: { userId, status: { not: "PENDING" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function addToNeedList(data: {
  name: string;
  description?: string;
  estimatedCost?: number;
  url?: string;
  categoryHint?: string;
  priority?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.needListItem.create({
      data: {
        name: data.name,
        description: data.description,
        estimatedCost: data.estimatedCost ? toPaisas(data.estimatedCost) : null,
        url: data.url,
        categoryHint: data.categoryHint,
        priority: data.priority ?? "MEDIUM",
        userId,
      },
    });
    revalidatePath("/need-list");
    return { success: true };
  } catch (e) {
    console.error("[addToNeedList]", e);
    return { success: false, error: "Failed to add item" };
  }
}

export async function doneNeedListItem(id: string, data?: {
  categoryId?: string;
  actualAmount?: number;
  date?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();

    if (data?.categoryId) {
      const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
      const { month, year } = getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
      const item = await prisma.needListItem.findFirst({ where: { id, userId } });
      if (!item) return { success: false, error: "Item not found" };

      const amount = data.actualAmount ? toPaisas(data.actualAmount) : (item.estimatedCost ?? 0);

      await prisma.$transaction([
        prisma.needListItem.update({
          where: { id },
          data: { status: "DONE", doneAt: new Date() },
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

      revalidatePath("/expenses");
    } else {
      await prisma.needListItem.updateMany({ where: { id, userId }, data: { status: "DONE", doneAt: new Date() } });
    }

    revalidatePath("/need-list");
    return { success: true };
  } catch (e) {
    console.error("[doneNeedListItem]", e);
    return { success: false, error: "Failed to mark as done" };
  }
}

export async function skipNeedListItem(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.needListItem.updateMany({ where: { id, userId }, data: { status: "SKIPPED" } });
    revalidatePath("/need-list");
    return { success: true };
  } catch (e) {
    console.error("[skipNeedListItem]", e);
    return { success: false, error: "Failed to skip item" };
  }
}

export async function deleteNeedListItem(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.needListItem.deleteMany({ where: { id, userId } });
    revalidatePath("/need-list");
    return { success: true };
  } catch (e) {
    console.error("[deleteNeedListItem]", e);
    return { success: false, error: "Failed to delete item" };
  }
}
