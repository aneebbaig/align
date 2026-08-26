"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCurrencies } from "@/lib/currency-helpers";
import { ActionResult } from "@/types";

export { getCurrencies };

export async function createCurrency(data: {
  code: string;
  symbol: string;
  rateToBase: number;
}): Promise<ActionResult> {
  try {
    await getUserId();
    const code = data.code.trim().toUpperCase();
    if (!code) return { success: false, error: "Currency code is required" };
    if (data.rateToBase <= 0) return { success: false, error: "Exchange rate must be positive" };
    const existing = await prisma.currency.findUnique({ where: { code } });
    if (existing) return { success: false, error: "This currency already exists" };

    await prisma.currency.create({
      data: { code, symbol: data.symbol.trim() || code, rateToBase: data.rateToBase },
    });
    revalidatePath("/settings");
    revalidatePath("/savings");
    return { success: true };
  } catch (e) {
    console.error("[createCurrency]", e);
    return { success: false, error: "Failed to add currency" };
  }
}

export async function updateCurrency(id: string, data: {
  symbol?: string;
  rateToBase?: number;
}): Promise<ActionResult> {
  try {
    await getUserId();
    if (data.rateToBase !== undefined && data.rateToBase <= 0) {
      return { success: false, error: "Exchange rate must be positive" };
    }
    const currency = await prisma.currency.findUnique({ where: { id } });
    if (!currency) return { success: false, error: "Currency not found" };
    if (currency.isBase && data.rateToBase !== undefined && data.rateToBase !== 1) {
      return { success: false, error: "The base currency's rate is always 1" };
    }
    await prisma.currency.update({
      where: { id },
      data: {
        ...(data.symbol !== undefined && { symbol: data.symbol.trim() || currency.symbol }),
        ...(data.rateToBase !== undefined && !currency.isBase && { rateToBase: data.rateToBase }),
      },
    });
    revalidatePath("/settings");
    revalidatePath("/savings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[updateCurrency]", e);
    return { success: false, error: "Failed to update currency" };
  }
}

/** Switch which currency is the household's base (reporting/aggregation) currency. */
export async function setBaseCurrency(id: string): Promise<ActionResult> {
  try {
    await getUserId();
    const target = await prisma.currency.findUnique({ where: { id } });
    if (!target) return { success: false, error: "Currency not found" };
    if (target.isBase) return { success: true };

    await prisma.$transaction([
      prisma.currency.updateMany({ where: { isBase: true }, data: { isBase: false } }),
      prisma.currency.update({ where: { id }, data: { isBase: true, rateToBase: 1 } }),
    ]);
    revalidatePath("/settings");
    revalidatePath("/savings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[setBaseCurrency]", e);
    return { success: false, error: "Failed to change base currency" };
  }
}

export async function deleteCurrency(id: string): Promise<ActionResult> {
  try {
    await getUserId();
    const currency = await prisma.currency.findUnique({ where: { id } });
    if (!currency) return { success: false, error: "Currency not found" };
    if (currency.isBase) return { success: false, error: "Cannot delete the base currency" };

    try {
      await prisma.currency.delete({ where: { id } });
    } catch {
      return { success: false, error: "This currency is still used by existing pots or transactions" };
    }
    revalidatePath("/settings");
    revalidatePath("/savings");
    return { success: true };
  } catch (e) {
    console.error("[deleteCurrency]", e);
    return { success: false, error: "Failed to delete currency" };
  }
}
