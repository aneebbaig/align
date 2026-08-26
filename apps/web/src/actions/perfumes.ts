"use server";

// PRIVACY CRITICAL: All queries MUST filter by session userId. Never return another user's data.

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPaisas } from "@/lib/utils";
import { ActionResult } from "@/types";

export async function getPerfumes() {
  const userId = await getUserId();
  return prisma.perfume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPerfume(data: {
  name: string;
  category: string;
  price: number;
  quantity?: number | null;
  status: string;
  isLiked: boolean;
  buyNext: boolean;
  isSummer: boolean;
  blindBuy: boolean;
  occasion?: string | null;
  notes?: string | null;
  company?: string | null;
  basedOn?: string | null;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.perfume.create({
      data: { ...data, price: toPaisas(data.price), userId },
    });
    revalidatePath("/perfumes");
    return { success: true };
  } catch (e) {
    console.error("[createPerfume]", e);
    return { success: false, error: "Failed to create perfume" };
  }
}

export async function updatePerfume(id: string, data: Partial<{
  name: string; category: string; price: number; quantity: number | null;
  status: string; isLiked: boolean; buyNext: boolean; isSummer: boolean;
  blindBuy: boolean; occasion: string | null; notes: string | null;
  company: string | null; basedOn: string | null;
}>): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.perfume.updateMany({
      where: { id, userId },
      data: {
        ...data,
        price: data.price !== undefined ? toPaisas(data.price) : undefined,
      },
    });
    revalidatePath("/perfumes");
    return { success: true };
  } catch (e) {
    console.error("[updatePerfume]", e);
    return { success: false, error: "Failed to update perfume" };
  }
}

export async function deletePerfume(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.perfume.deleteMany({ where: { id, userId } });
    revalidatePath("/perfumes");
    return { success: true };
  } catch (e) {
    console.error("[deletePerfume]", e);
    return { success: false, error: "Failed to delete perfume" };
  }
}
