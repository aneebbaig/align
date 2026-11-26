import { z } from "zod";
import type { FundingOption } from "@/components/shared/split-funding";
import type { QuickPicks } from "@/actions/expenses";
import { evaluateAmount } from "@/lib/amount-expr";
import { formatAmount } from "@/lib/currency-utils";

// ─── types ─────────────────────────────────────────────────────────────────────

export const schema = z.object({
  // Free text: a plain number or a simple sum like "35+67" (see evaluateAmount).
  amount: z.string().superRefine((v, ctx) => {
    const r = evaluateAmount(v);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
  }),
  categoryId: z.string().min(1, "Category is required"),
  // Optional, like the phone app: left blank it falls back to the category name.
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().min(1),
  isRecurring: z.boolean(),
  recurringFrequency: z.string().optional(),
  tags: z.string().optional(),
  isRegretPurchase: z.boolean(),
});

export type FormValues = z.infer<typeof schema>;

export interface SplitSource {
  value: string;      // "INCOME" | "POT:id:currencyId"
  pkrAmount: string;  // base-currency amount as string (user input)
}

export interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }

export interface Props {
  defaultType: "EXPENSE" | "INCOME";
  categories: { id: string; name: string; color: string; icon: string }[];
  transaction?: {
    id: string; amount: number; categoryId: string; description: string;
    notes?: string | null; date: Date; budgetMonth?: number; budgetYear?: number; isRecurring: boolean;
    recurringFrequency?: string | null; tags: string; isRegretPurchase?: boolean;
    fundingSource?: string; fundingPotId?: string | null; fundingCurrencyId?: string | null; fundingAmount?: number | null;
    fundingSources?: { priority: number; source: string; potId: string | null; currencyId: string | null; potAmount?: number | null; pkrAmount: number; pot?: { id: string; name: string; type: string } | null }[];
    // Income entered in another currency: edited in that currency at the rate it was booked with.
    nativeCurrencyId?: string | null; nativeAmount?: number | null; exchangeRateUsed?: number | null;
    // Set when a loan, loan payment or investment owns this entry (its amount/funding/period are changed there).
    loanPrincipalOf?: unknown; loanPaymentOf?: unknown; investmentContributionOf?: unknown;
  } | null;
  budgetByCategoryId?: Record<string, { allocated: number; spent: number }>;
  // Currencies the household has configured - used for the income native-currency picker.
  currencies?: CurrencyLite[];
  fundingContext?: {
    monthlyIncomeAvailable: number;
    pots: { id: string; name: string; type: string; balances: { amount: number; currency: CurrencyLite }[] }[];
  };
  // The period `fundingContext` was computed for (the page's open period at load time) -
  // used to detect when the date-budget checkbox targets a *different* period, so the
  // funding figures can be refetched for that period instead of showing a stale number.
  currentPeriod?: { month: number; year: number };
  dateFormat?: string;
  // One-tap shortcuts for new entries (repeats, top categories, description autocomplete).
  quickPicks?: QuickPicks;
  // True once amount, description, category or notes differ from where the form started.
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess: () => void;
}

export const IMPULSE_THRESHOLD = 5000; // base-currency 5,000


/** The amount field's value in major units, or 0 while it isn't a valid amount yet. */
export function amountOf(text: string): number {
  const r = evaluateAmount(text);
  return r.ok ? r.value : 0;
}

/** Parse a funding picker value into action-ready data. */
export function parseFundingValue(value: string): { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string } {
  if (value.startsWith("POT:")) {
    const [, potId, currencyId] = value.split(":");
    return { source: "SAVINGS_POT", potId, currencyId };
  }
  return { source: "INCOME" };
}

/** Build initial funding picker value from a saved transaction. */
export function fundingValueFromTransaction(t?: Props["transaction"]): string {
  if (t?.fundingSource === "SPLIT" && t.fundingSources?.length) {
    // Split transactions are shown in locked summary - return INCOME as default for new
    return "INCOME";
  }
  if (t?.fundingSource === "SAVINGS_POT" && t.fundingPotId && t.fundingCurrencyId) {
    return `POT:${t.fundingPotId}:${t.fundingCurrencyId}`;
  }
  return "INCOME";
}

// ─── funding picker options ──────────────────────────────────────────────────

export function buildFundingOptions(fundingContext: Props["fundingContext"], baseSymbol: string): FundingOption[] {
  if (!fundingContext) return [];
  const opts: FundingOption[] = [
    { value: "INCOME", group: "income", label: `Monthly income · ${baseSymbol} ${formatAmount(Math.max(0, fundingContext.monthlyIncomeAvailable))} available` },
  ];
  for (const pot of fundingContext.pots) {
    for (const b of pot.balances) {
      if (b.amount > 0) opts.push({ value: `POT:${pot.id}:${b.currency.id}`, group: "pot", label: `${pot.name} (${pot.type}) · ${b.currency.symbol} ${formatAmount(b.amount)}` });
    }
  }
  return opts;
}

/** Adds back what an existing expense holds, so pickers show what it could draw on if re-funded. */
export function restoreFunding(ctx: NonNullable<Props["fundingContext"]>, t: NonNullable<Props["transaction"]>): NonNullable<Props["fundingContext"]> {
  let income = ctx.monthlyIncomeAvailable;
  const potBack = new Map<string, number>(); // `${potId}:${currencyId}` -> units
  if (t.fundingSource === "SPLIT") {
    for (const r of t.fundingSources ?? []) {
      if (r.source === "INCOME") income += r.pkrAmount;
      else if (r.potId && r.currencyId) potBack.set(`${r.potId}:${r.currencyId}`, (potBack.get(`${r.potId}:${r.currencyId}`) ?? 0) + (r.potAmount ?? 0));
    }
  } else if (t.fundingSource === "SAVINGS_POT" && t.fundingPotId && t.fundingCurrencyId) {
    potBack.set(`${t.fundingPotId}:${t.fundingCurrencyId}`, t.fundingAmount ?? 0);
  } else {
    income += t.amount;
  }
  const pots = ctx.pots.map((p) => {
    const balances = p.balances.map((b) => ({ ...b, amount: b.amount + (potBack.get(`${p.id}:${b.currency.id}`) ?? 0) }));
    // A pot drained to zero by this expense has no balance row to show - bring it back.
    for (const [key, units] of potBack) {
      const [potId, currencyId] = key.split(":");
      if (potId === p.id && units > 0 && !balances.some((b) => b.currency.id === currencyId)) {
        const currency = ctx.pots.flatMap((x) => x.balances).find((b) => b.currency.id === currencyId)?.currency;
        if (currency) balances.push({ amount: units, currency });
      }
    }
    return { ...p, balances };
  });
  return { monthlyIncomeAvailable: income, pots };
}

/** Split funding for submit: every row but the last as typed, the last takes the remainder. Null when not split. */
export function buildSplitPayload(useSplit: boolean, splitSources: SplitSource[], totalAmount: number): {
  splitSources: { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string; pkrAmount: number }[];
} | null {
  if (!useSplit || splitSources.length < 2) return null;
  const totalPaisas = Math.round(totalAmount * 100);
  const allocatedBeforeLast = splitSources.slice(0, -1).reduce((s, src) => s + (Math.round(parseFloat(src.pkrAmount || "0") * 100) || 0), 0);
  const lastPkrAmount = totalPaisas - allocatedBeforeLast;
  return {
    splitSources: splitSources.map((src, idx) => {
      const pkrAmount = idx === splitSources.length - 1 ? lastPkrAmount : Math.round(parseFloat(src.pkrAmount || "0") * 100);
      return { ...parseFundingValue(src.value), pkrAmount };
    }),
  };
}
