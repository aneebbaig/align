// ─── Golden scenario ─────────────────────────────────────────────────────────
// The exact scenario from the feature spec. Amounts are in WHOLE RUPEES here
// (the scheduler is unit-agnostic) so the fixture reads identically to the spec.
// Shared by the vitest golden test AND the printable side-by-side demo so the
// numbers can never drift between "what we assert" and "what we show".

import type { IncomeRule, ObligationRule } from "./types";

export const GOLDEN_INCOMES: IncomeRule[] = [
  // Salary: fixed date + amount, but it is eaten by fixed living costs, so it is
  // NOT part of the conservative debt-service floor (countTowardFloor: false).
  {
    id: "salary",
    label: "Salary",
    kind: "SALARY",
    amount: 155_000,
    startMonth: 1,
    variable: false,
    countTowardFloor: false,
  },
  // Freelance: variable, known floor of 111,000 — this IS the reliable floor.
  {
    id: "freelance",
    label: "Freelance (floor)",
    kind: "FREELANCE",
    amount: 111_000,
    startMonth: 1,
    variable: true,
    countTowardFloor: true,
  },
];

export const GOLDEN_OBLIGATIONS: ObligationRule[] = [
  // Loan A (no interest): 20,000 due month 1; remaining 60,000 due month 4.
  // One real loan → two LUMP_SUM tranches sharing sourceId "loanA".
  {
    id: "loanA-t1",
    sourceId: "loanA",
    payee: "Loan A",
    category: "LOAN",
    kind: "LUMP_SUM",
    amount: 20_000,
    startMonth: 1,
    flexibility: "FIXED",
    priority: 0,
    slideWindowMonths: 0,
  },
  {
    id: "loanA-t2",
    sourceId: "loanA",
    payee: "Loan A",
    category: "LOAN",
    kind: "LUMP_SUM",
    amount: 60_000,
    startMonth: 4,
    flexibility: "FIXED",
    priority: 0,
    slideWindowMonths: 0,
  },
  // One-off expense: 120,000 due month 2 (sister's tuition).
  {
    id: "tuition",
    sourceId: "tuition",
    payee: "Sister's tuition",
    category: "EXPENSE",
    kind: "LUMP_SUM",
    amount: 120_000,
    startMonth: 2,
    flexibility: "FIXED",
    priority: 0,
    slideWindowMonths: 0,
  },
  // Loan B (nikah, no interest, flexible ±1 month): 83,000/month, months 3–8.
  {
    id: "loanB",
    sourceId: "loanB",
    payee: "Loan B (nikah)",
    category: "LOAN",
    kind: "FIXED_INSTALLMENT",
    amount: 83_000,
    startMonth: 3,
    endMonth: 8,
    flexibility: "FLEXIBLE",
    priority: 0,
    slideWindowMonths: 1,
  },
];

/** Expected due-total per month, straight from the spec. */
export const GOLDEN_EXPECTED = [
  { month: 1, dueTotal: 20_000, flagged: false, shortfall: 0 },
  { month: 2, dueTotal: 120_000, flagged: true, shortfall: 9_000 },
  { month: 3, dueTotal: 83_000, flagged: false, shortfall: 0 },
  { month: 4, dueTotal: 143_000, flagged: true, shortfall: 32_000 },
  { month: 5, dueTotal: 83_000, flagged: false, shortfall: 0 },
  { month: 6, dueTotal: 83_000, flagged: false, shortfall: 0 },
  { month: 7, dueTotal: 83_000, flagged: false, shortfall: 0 },
  { month: 8, dueTotal: 83_000, flagged: false, shortfall: 0 },
] as const;
