"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/types";

export async function getTasks(filters?: { type?: string; status?: string; category?: string }) {
  const userId = await getUserId();
  const where: { userId: string; type?: string; status?: string; category?: string } = { userId };
  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;
  if (filters?.category) where.category = filters.category;

  return prisma.task.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function updateTaskOrder(updates: { id: string; order: number }[]): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.$transaction(
      updates.map(({ id, order }) =>
        prisma.task.updateMany({ where: { id, userId }, data: { order } })
      )
    );
    return { success: true };
  } catch (e) {
    console.error("[updateTaskOrder]", e);
    return { success: false, error: "Failed to update order" };
  }
}

export async function getTodaysTasks() {
  const userId = await getUserId();
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  return prisma.task.findMany({
    where: {
      userId,
      status: { not: "DONE" },
      OR: [
        { type: "DAILY" },
        { dueDate: { gte: startOfDay, lte: endOfDay } },
        { dueDate: { lt: startOfDay }, status: { not: "DONE" } },
      ],
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 5,
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  type: string;
  priority: string;
  dueDate?: string;
  dueTime?: string;
  recurrenceRule?: string;
  category?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const maxOrder = await prisma.task.aggregate({ where: { userId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? 0) + 1;
    await prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        order,
        userId,
      },
    });
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[createTask]", e);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTaskStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return { success: false, error: "Not found" };

    await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      },
    });
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[updateTaskStatus]", e);
    return { success: false, error: "Failed to update task" };
  }
}

export async function updateTask(id: string, data: {
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  dueTime?: string;
  category?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return { success: false, error: "Not found" };

    await prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      },
    });
    revalidatePath("/tasks");
    return { success: true };
  } catch (e) {
    console.error("[updateTask]", e);
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.task.deleteMany({ where: { id, userId } });
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteTask]", e);
    return { success: false, error: "Failed to delete task" };
  }
}
