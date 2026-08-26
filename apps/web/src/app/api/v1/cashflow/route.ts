import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { buildProjectionInput, daysUntilEndOfMonth, listUpcomingDue, type UpcomingDue } from "@/lib/cashflow/adapter";
import { loadAdapterInput } from "@/lib/cashflow/data-loader";
import { projectCashflow } from "@/lib/cashflow/scheduler";

function serializeDue(d: UpcomingDue) {
  return {
    sourceId: d.sourceId,
    payee: d.payee,
    category: d.category,
    amountPaisas: d.amount,
    dueDate: d.dueDate.toISOString(),
    daysUntil: d.daysUntil,
  };
}

// Mirrors getCashflowMonthSummary() + getUpcomingDueAlerts() from
// src/actions/cashflow.ts, combined into one v1 payload for the mobile client.
export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { cashflowHorizonMonths: true, cashflowLeadTimeDays: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const horizon = user.cashflowHorizonMonths ?? 8;
    const leadTime = user.cashflowLeadTimeDays ?? 3;
    const anchor = new Date();
    const data = await loadAdapterInput(auth.id);

    const projection = projectCashflow(buildProjectionInput(data, anchor, horizon));
    const month1 = projection[0];
    const dueThisMonth = listUpcomingDue(data, anchor, daysUntilEndOfMonth(anchor));
    const alerts = listUpcomingDue(data, anchor, leadTime);

    return NextResponse.json({
      data: {
        summary: {
          dueTotalPaisas: month1?.dueTotal ?? 0,
          leftAfterObligationsPaisas: month1?.leftAfterObligations ?? 0,
          flagged: month1?.flagged ?? false,
          shortfallPaisas: month1?.shortfall ?? 0,
          soonest: dueThisMonth[0] ? serializeDue(dueThisMonth[0]) : null,
        },
        alerts: alerts.map(serializeDue),
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
