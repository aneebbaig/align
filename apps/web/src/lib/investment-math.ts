// Pure money rules for investments - no DB. Invested = total deposited;
// withdrawals only lower the current value, and gain counts what was taken
// out, so taking profits never shows a negative "invested".

export type ContributionType = "DEPOSIT" | "WITHDRAWAL";

export interface InvestmentTotals {
  investedAmount: number; // paisas, total deposited
  currentValue: number; // paisas, what it's worth now
}

interface Movement {
  type: ContributionType;
  amount: number; // paisas, always positive
}

export function applyMovement(t: InvestmentTotals, m: Movement): InvestmentTotals | { error: string } {
  if (!Number.isInteger(m.amount) || m.amount <= 0) return { error: "Amount must be greater than zero" };
  if (m.type === "DEPOSIT") {
    return { investedAmount: t.investedAmount + m.amount, currentValue: t.currentValue + m.amount };
  }
  if (m.amount > t.currentValue) return { error: "You can't withdraw more than the current value" };
  return { investedAmount: t.investedAmount, currentValue: t.currentValue - m.amount };
}

export function reverseMovement(t: InvestmentTotals, m: Movement): InvestmentTotals {
  if (m.type === "DEPOSIT") {
    return {
      investedAmount: Math.max(0, t.investedAmount - m.amount),
      currentValue: Math.max(0, t.currentValue - m.amount),
    };
  }
  return { investedAmount: t.investedAmount, currentValue: t.currentValue + m.amount };
}

export function withdrawnTotal(rows: { type: string; amount: number }[]): number {
  return rows.filter((r) => r.type === "WITHDRAWAL").reduce((s, r) => s + r.amount, 0);
}

export function investmentGain(t: InvestmentTotals, withdrawn: number): { gain: number; gainPct: number } {
  const gain = t.currentValue + withdrawn - t.investedAmount;
  const gainPct = t.investedAmount > 0 ? (gain / t.investedAmount) * 100 : 0;
  return { gain, gainPct };
}
