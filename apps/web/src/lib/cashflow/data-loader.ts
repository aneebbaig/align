import { prisma } from "@/lib/prisma";
import type { AdapterInput } from "@/lib/cashflow/adapter";

// Shared by both the "use server" actions (web) and the v1 bearer-auth API
// routes (mobile) - kept out of cashflow.ts since that file is "use server"
// and can't be imported from a plain API route handler.
export async function loadAdapterInput(userId: string): Promise<AdapterInput> {
  const [loanSchedules, recurringIncomes, plannedExpenses] = await Promise.all([
    prisma.loanSchedule.findMany({
      where: { userId, loan: { status: { not: "PAID" } } },
      include: { loan: { select: { personName: true } } },
    }),
    prisma.recurringIncome.findMany({ where: { userId, active: true } }),
    prisma.plannedExpense.findMany({ where: { userId, status: "PLANNED" } }),
  ]);

  return {
    loanSchedules: loanSchedules.map((s) => ({
      id: s.id,
      loanId: s.loanId,
      kind: s.kind,
      amount: s.amount,
      startDate: s.startDate,
      endDate: s.endDate,
      flexibility: s.flexibility,
      priority: s.priority,
      slideWindowMonths: s.slideWindowMonths,
      interestRate: s.interestRate,
      payee: s.loan.personName,
    })),
    recurringIncomes: recurringIncomes.map((i) => ({
      id: i.id,
      label: i.label,
      kind: i.kind,
      amount: i.amount,
      variable: i.variable,
      countsTowardFloor: i.countsTowardFloor,
      startDate: i.startDate,
      endDate: i.endDate,
      active: i.active,
    })),
    plannedExpenses: plannedExpenses.map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      dueDate: p.dueDate,
      flexibility: p.flexibility,
      priority: p.priority,
      slideWindowMonths: p.slideWindowMonths,
      status: p.status,
    })),
  };
}
