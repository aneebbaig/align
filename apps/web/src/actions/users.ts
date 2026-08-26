"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/types";
import bcrypt from "bcryptjs";

async function requireSuperAdmin(): Promise<string> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "SUPER_ADMIN") throw new Error("Forbidden");
  return user.id;
}

async function getAuthenticatedUserId(): Promise<string> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function getUsers() {
  await requireSuperAdmin();
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function adminCreateUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    if (data.password.length < 8) return { success: false, error: "Password must be at least 8 characters" };
    const existingByEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingByEmail) return { success: false, error: "A user with this email already exists" };

    const hashedPassword = await bcrypt.hash(data.password, 12);
    // Copy shared settings from first existing user so new user starts in sync
    const existing = await prisma.user.findFirst({ select: { dateFormat: true, firstDayOfWeek: true, emergencyFundMonths: true } });
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: data.role,
        dateFormat: existing?.dateFormat ?? "dd/MM/yyyy",
        firstDayOfWeek: existing?.firstDayOfWeek ?? 1,
        emergencyFundMonths: existing?.emergencyFundMonths ?? 6,
      },
    });
    // better-auth logs users in against the credential `account` row (bcrypt
    // verify is configured in lib/auth.ts), so create one alongside the user.
    await prisma.account.create({
      data: {
        id: `cred_${user.id}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create user";
    return { success: false, error: msg };
  }
}

export async function adminDeleteUser(id: string): Promise<ActionResult> {
  try {
    const selfId = await requireSuperAdmin();
    if (id === selfId) return { success: false, error: "You cannot delete your own account" };
    await prisma.user.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete user";
    return { success: false, error: msg };
  }
}

export async function adminUpdateUserRole(id: string, role: string): Promise<ActionResult> {
  try {
    const selfId = await requireSuperAdmin();
    if (id === selfId) return { success: false, error: "You cannot change your own role" };
    await prisma.user.update({ where: { id }, data: { role } });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update role" };
  }
}

export async function updateNotificationPreferences(data: {
  notifyBudgetWarning: boolean;
  notifyDoomSpending: boolean;
  notifyLoanDue: boolean;
  notifyDailyDigest: boolean;
  notifyDigestTasks: boolean;
  notifyDigestCalendar: boolean;
  notifyDigestBudget: boolean;
  notifyDigestFinancials: boolean;
}): Promise<ActionResult> {
  try {
    const userId = await getAuthenticatedUserId();
    await prisma.user.update({ where: { id: userId }, data });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save notification preferences" };
  }
}

export async function getNotificationPreferences() {
  const userId = await getAuthenticatedUserId();
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyBudgetWarning: true, notifyDoomSpending: true, notifyLoanDue: true,
      notifyDailyDigest: true, notifyDigestTasks: true, notifyDigestCalendar: true,
      notifyDigestBudget: true, notifyDigestFinancials: true,
    },
  });
}
