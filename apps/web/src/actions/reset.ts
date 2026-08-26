"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/types";
import { RESET_GROUP_KEYS } from "@/lib/reset-groups";
import { wipeAppData } from "@/lib/reset-data";

async function requireSuperAdmin(): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function resetAppData(
  keys: string[],
): Promise<ActionResult<Record<string, number>>> {
  try {
    await requireSuperAdmin();

    const validKeys = new Set<string>(RESET_GROUP_KEYS);
    const selected = keys.filter((k) => validKeys.has(k));
    if (selected.length === 0) {
      return { success: false, error: "Select at least one thing to reset" };
    }

    const deleted = await wipeAppData(prisma, selected);

    revalidatePath("/", "layout");
    return { success: true, data: deleted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to reset data";
    return { success: false, error: msg };
  }
}
