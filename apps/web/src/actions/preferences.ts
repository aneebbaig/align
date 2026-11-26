"use server";

import { revalidatePath } from "next/cache";
import { getLoginUser, getLoginUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseHiddenSections } from "@/lib/hidden-sections";

type ActionResult = { success: boolean; error?: string };

// Personal to the login (not the household owner).
export async function getHiddenSections(): Promise<string[]> {
  const me = await getLoginUser({ hiddenSections: true });
  return (me.hiddenSections as string[] | null) ?? [];
}

export async function setHiddenSections(keys: string[]): Promise<ActionResult> {
  const clean = parseHiddenSections(keys);
  if (!clean) return { success: false, error: "Unknown section" };
  try {
    const id = await getLoginUserId();
    await prisma.user.update({ where: { id }, data: { hiddenSections: clean } });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error("[setHiddenSections]", e);
    return { success: false, error: "Failed to save" };
  }
}
