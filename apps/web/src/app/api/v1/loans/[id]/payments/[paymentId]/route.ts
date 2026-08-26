import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBearerAuth } from "@/lib/v1-auth";
import { updateLoanPaymentCore, deleteLoanPaymentCore } from "@/lib/loans/payments";

// ── PATCH/DELETE /api/v1/loans/[id]/payments/[paymentId] ──────────────────────
// `id` (the loan id) is unused here - the payment is looked up + scoped by
// (paymentId, userId) directly, mirroring the web action's own scoping.

const updatePaymentSchema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
  fundingSource: z.enum(["INCOME", "SAVINGS_POT"]).optional(),
  fundingPotId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { paymentId } = await params;

  try {
    const body = await req.json();
    const parsed = updatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await updateLoanPaymentCore(auth.id, paymentId, {
      amountPaisas: parsed.data.amountPaisas,
      date: parsed.data.date,
      notes: parsed.data.notes,
      budgetMonth: parsed.data.budgetMonth,
      budgetYear: parsed.data.budgetYear,
      fundingSource: parsed.data.fundingSource,
      fundingPotId: parsed.data.fundingPotId,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { paymentId } = await params;

  try {
    const result = await deleteLoanPaymentCore(auth.id, paymentId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
