import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sumTotals } from "@/lib/wedding/totals";

// Shared helpers for the /api/v1/wedding routes. All money is in paisas (the
// smallest unit), same as the other v1 routes and the database.

export const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
export const serverError = () => fail("Server error", 500);
export const notFound = () => fail("Not found", 404);

export async function readJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: fail("Invalid JSON", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, res: fail(parsed.error.issues[0]?.message ?? "Invalid request", 400) };
  return { ok: true, data: parsed.data };
}

export const paisas = z.number().int().min(0).max(100_000_000_000);
const optText = (max: number) => z.string().max(max).nullable().optional();
export const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export const planInclude = {
  events: { orderBy: { order: "asc" as const } },
  expenses: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    include: { quotes: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] } },
  },
};

type PlanWithAll = NonNullable<Awaited<ReturnType<typeof findPlan>>>;
export const findPlan = (id: string, userId: string) =>
  prisma.weddingPlan.findFirst({ where: { id, userId }, include: planInclude });

export const ownedPlan = (id: string, userId: string) =>
  prisma.weddingPlan.findFirst({ where: { id, userId }, select: { id: true } });

export const ownedExpense = (id: string, planId: string, userId: string) =>
  prisma.weddingExpense.findFirst({
    where: { id, weddingPlanId: planId, weddingPlan: { userId } },
    select: { id: true, weddingPlanId: true, estimatedAmount: true, actualAmount: true, paidAmount: true },
  });

export const ownedQuote = (id: string, expenseId: string, planId: string, userId: string) =>
  prisma.weddingQuote.findFirst({
    where: { id, expenseId, expense: { weddingPlanId: planId, weddingPlan: { userId } } },
  });

export function totalsOf(expenses: PlanWithAll["expenses"]) {
  const t = sumTotals(expenses);
  return {
    count: t.count,
    estimated: t.estimated,
    projected: t.projected,
    actual: t.actual,
    priced: t.priced,
    paid: t.paid,
    outstanding: t.outstanding,
  };
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function serializePlanSummary(p: PlanWithAll) {
  return {
    id: p.id,
    brideName: p.brideName,
    groomName: p.groomName,
    weddingDate: iso(p.weddingDate),
    totalBudget: p.totalBudget,
    haqMehr: p.haqMehr,
    haqMehrNote: p.haqMehrNote,
    status: p.status,
    eventCount: p.events.length,
    totals: totalsOf(p.expenses),
  };
}

export function serializePlan(p: PlanWithAll) {
  return {
    ...serializePlanSummary(p),
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    events: p.events.map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      date: iso(e.date),
      venue: e.venue,
      guestCount: e.guestCount,
      budgetAllocated: e.budgetAllocated,
      notes: e.notes,
      status: e.status,
      responsibleParty: e.responsibleParty,
      order: e.order,
    })),
    expenses: p.expenses.map((x) => ({
      id: x.id,
      eventId: x.eventId,
      name: x.name,
      category: x.category,
      estimatedAmount: x.estimatedAmount,
      actualAmount: x.actualAmount,
      paidAmount: x.paidAmount,
      vendorName: x.vendorName,
      vendorPhone: x.vendorPhone,
      vendorInstagram: x.vendorInstagram,
      notes: x.notes,
      createdAt: x.createdAt.toISOString(),
      quotes: x.quotes.map((q) => ({
        id: q.id,
        vendorName: q.vendorName,
        phone: q.phone,
        instagram: q.instagram,
        amount: q.amount,
        notes: q.notes,
        isChosen: q.isChosen,
      })),
    })),
  };
}

export const expenseFields = {
  name: z.string().trim().min(1, "Give the expense a name").max(200),
  category: z.string().min(1).max(40),
  eventId: z.string().nullable(),
  estimatedAmount: paisas,
  actualAmount: paisas.nullable(),
  paidAmount: paisas,
  vendorName: optText(200),
  vendorPhone: optText(60),
  vendorInstagram: optText(100),
  notes: optText(2000),
};

export const quoteFields = {
  vendorName: z.string().trim().min(1, "Enter the vendor's name").max(200),
  amount: paisas,
  phone: optText(60),
  instagram: optText(100),
  notes: optText(2000),
};
