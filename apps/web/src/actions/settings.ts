"use server";

import { revalidatePath } from "next/cache";
import { getServerUser, getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/types";
import bcrypt from "bcryptjs";

export async function getCategories() {
  await getUserId();
  return prisma.category.findMany({
    where: { isHidden: false },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getCategoriesByType(type: "EXPENSE" | "INCOME" | "BOTH") {
  await getUserId();
  return prisma.category.findMany({
    where: {
      AND: [
        { OR: [{ type }, { type: "BOTH" }] },
        { isHidden: false },
      ],
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createCategory(data: {
  name: string;
  icon: string;
  color: string;
  type: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.category.create({
      data: { ...data, userId, isDefault: false },
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateCategory(id: string, data: {
  name?: string;
  icon?: string;
  color?: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    // Default categories are shared (userId: null) - any household member can
    // edit them. Custom categories are only editable by their owner.
    const { count } = await prisma.category.updateMany({
      where: { id, OR: [{ userId }, { isDefault: true }] },
      data,
    });
    if (count === 0) return { success: false, error: "Category not found" };
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update category" };
  }
}

export async function hideCategory(id: string): Promise<ActionResult> {
  try {
    await prisma.category.update({ where: { id }, data: { isHidden: true } });
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to hide category" };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return { success: false, error: "Category not found" };
    // Default categories are shared and deletable by anyone; custom categories
    // only by their owner.
    if (!category.isDefault && category.userId !== userId) {
      return { success: false, error: "Not authorized to delete this category" };
    }
    try {
      await prisma.category.delete({ where: { id } });
    } catch {
      // Category has transactions referencing it - hide it instead
      await prisma.category.update({ where: { id }, data: { isHidden: true } });
    }
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to delete category" };
  }
}

export async function updateUserSettings(data: {
  name: string;
  dateFormat: string;
  firstDayOfWeek: number;
  emergencyFundMonths: number;
  cashflowHorizonMonths: number;
  cashflowLeadTimeDays: number;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    // Update name for current user only (personal)
    await prisma.user.update({ where: { id: userId }, data: { name: data.name } });
    // Shared settings propagate to ALL users so both household members stay in sync
    const { name: _name, ...sharedSettings } = data;
    await prisma.user.updateMany({ data: sharedSettings });
    revalidatePath("/settings");
    revalidatePath("/savings");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    if (data.newPassword.length < 8) return { success: false, error: "Password must be at least 8 characters" };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User not found" };

    const valid = await bcrypt.compare(data.currentPassword, user.hashedPassword);
    if (!valid) return { success: false, error: "Current password is incorrect" };

    const hashed = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { hashedPassword: hashed } });
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to change password" };
  }
}

export async function updateEmergencyFundMonths(months: number): Promise<ActionResult> {
  try {
    await getUserId();
    await prisma.user.updateMany({ data: { emergencyFundMonths: months } });
    revalidatePath("/savings");
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update emergency fund target" };
  }
}

export async function getUserSettings() {
  const userId = await getUserId();
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, dateFormat: true,
      firstDayOfWeek: true, currentBudgetMonth: true, currentBudgetYear: true, emergencyFundMonths: true,
      cashflowHorizonMonths: true, cashflowLeadTimeDays: true,
      notifyBudgetWarning: true, notifyDoomSpending: true, notifyLoanDue: true,
      notifyDailyDigest: true, notifyDigestTasks: true, notifyDigestCalendar: true,
      notifyDigestBudget: true, notifyDigestFinancials: true,
    },
  });
}

export async function getRecurringTransactions() {
  const userId = await getUserId();
  return prisma.transaction.findMany({
    where: { userId, isRecurring: true },
    include: { category: { select: { name: true, color: true } } },
    orderBy: { date: "desc" },
  });
}

export async function exportUserData(): Promise<{ success: true; data: object } | { success: false; error: string }> {
  try {
    const userId = await getUserId();
    const [transactions, categories, budgets, planners, savingsPots, investments, tasks, loans] =
      await Promise.all([
        prisma.transaction.findMany({ where: { userId }, include: { category: true } }),
        prisma.category.findMany({ where: { userId, isHidden: false } }),
        prisma.budget.findMany({ where: { userId }, include: { budgetCategories: true } }),
        prisma.plan.findMany({ where: { userId }, include: { items: true } }),
        prisma.savingsPot.findMany({ where: { userId }, include: { history: true, balances: { include: { currency: true } } } }),
        prisma.investment.findMany({ where: { userId } }),
        prisma.task.findMany({ where: { userId } }),
        prisma.loan.findMany({ where: { userId }, include: { payments: true } }),
      ]);

    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        transactions,
        categories,
        budgets,
        planners,
        savingsPots,
        investments,
        tasks,
        loans,
      },
    };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Export failed" };
  }
}
