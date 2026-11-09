"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createTransaction, getExpenseFundingContext, updateTransaction } from "@/actions/expenses";
import { BudgetPeriodOverride, monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { SplitFunding, FundingSelectContent, type FundingOption } from "@/components/shared/split-funding";
import { FormSection, MoreOptions } from "@/components/shared/form-section";
import { addToWantList } from "@/actions/want-list";
import { cn, getMonthName } from "@/lib/utils";
import { evaluateAmount } from "@/lib/amount-expr";
import { CategoryCombobox } from "@/components/shared/category-combobox";

// ─── types ─────────────────────────────────────────────────────────────────────

const schema = z.object({
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

type FormValues = z.infer<typeof schema>;

interface SplitSource {
  value: string;      // "INCOME" | "POT:id:currencyId"
  pkrAmount: string;  // base-currency amount as string (user input)
}

interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }

interface Props {
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
  onSuccess: () => void;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

const IMPULSE_THRESHOLD = 5000; // base-currency 5,000

function dateFormatToLang(fmt: string): string {
  if (fmt.startsWith("MM/dd")) return "en-US";
  if (fmt.startsWith("yyyy")) return "sv";
  return "en-GB";
}

function fmtMoney(paisas: number) { return (paisas / 100).toLocaleString(); }

/** The amount field's value in major units, or 0 while it isn't a valid amount yet. */
function amountOf(text: string): number {
  const r = evaluateAmount(text);
  return r.ok ? r.value : 0;
}

/** Parse a funding picker value into action-ready data. */
function parseFundingValue(value: string): { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string } {
  if (value.startsWith("POT:")) {
    const [, potId, currencyId] = value.split(":");
    return { source: "SAVINGS_POT", potId, currencyId };
  }
  return { source: "INCOME" };
}

/** Build initial funding picker value from a saved transaction. */
function fundingValueFromTransaction(t?: Props["transaction"]): string {
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

function buildFundingOptions(fundingContext: Props["fundingContext"], baseSymbol: string): FundingOption[] {
  if (!fundingContext) return [];
  const opts: FundingOption[] = [
    { value: "INCOME", group: "income", label: `Monthly income · ${baseSymbol} ${fmtMoney(Math.max(0, fundingContext.monthlyIncomeAvailable))} available` },
  ];
  for (const pot of fundingContext.pots) {
    for (const b of pot.balances) {
      if (b.amount > 0) opts.push({ value: `POT:${pot.id}:${b.currency.id}`, group: "pot", label: `${pot.name} (${pot.type}) · ${b.currency.symbol} ${fmtMoney(b.amount)}` });
    }
  }
  return opts;
}

function FundingSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FundingOption[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <FundingSelectContent options={options} />
    </Select>
  );
}

/** Adds back what an existing expense holds, so pickers show what it could draw on if re-funded. */
function restoreFunding(ctx: NonNullable<Props["fundingContext"]>, t: NonNullable<Props["transaction"]>): NonNullable<Props["fundingContext"]> {
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

// ─── main component ────────────────────────────────────────────────────────────

export function TransactionForm({
  defaultType, categories, transaction, budgetByCategoryId = {},
  currencies = [], fundingContext, currentPeriod, dateFormat = "dd/MM/yyyy", onSuccess,
}: Props) {
  const baseCurrency = currencies.find((c) => c.isBase) ?? { id: "", code: "PKR", symbol: "Rs", rateToBase: 1, isBase: true };
  const [loading, setLoading] = useState(false);
  const [fileUnderDateBudget, setFileUnderDateBudget] = useState(false);
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring ?? false);
  const [isRegretPurchase, setIsRegretPurchase] = useState(transaction?.isRegretPurchase ?? false);
  const [selectedCategory, setSelectedCategory] = useState(transaction?.categoryId ?? "");
  // Categories added from the picker while this form is open.
  const [createdCategories, setCreatedCategories] = useState<Props["categories"]>([]);
  const allCategories = [...categories, ...createdCategories];
  const [impulseCheck, setImpulseCheck] = useState<{ data: FormValues } | null>(null);
  const [incomeCurrencyId, setIncomeCurrencyId] = useState(transaction?.nativeCurrencyId ?? baseCurrency.id);
  const [nativeRate, setNativeRate] = useState(
    transaction?.nativeCurrencyId && transaction.nativeAmount
      ? transaction.exchangeRateUsed ?? transaction.amount / transaction.nativeAmount
      : baseCurrency.rateToBase,
  );

  // Funding: either single source OR split
  const isExistingSplit = transaction?.fundingSource === "SPLIT";
  const [useSplit, setUseSplit] = useState(isExistingSplit);
  const [singleFundingValue, setSingleFundingValue] = useState(fundingValueFromTransaction(transaction));
  const [splitSources, setSplitSources] = useState<SplitSource[]>(() => {
    if (isExistingSplit && transaction?.fundingSources?.length) {
      return [...transaction.fundingSources]
        .sort((a, b) => a.priority - b.priority)
        .map((s) => ({
          value: s.potId && s.currencyId ? `POT:${s.potId}:${s.currencyId}` : "INCOME",
          pkrAmount: String(s.pkrAmount / 100),
        }));
    }
    return [{ value: "INCOME", pkrAmount: "" }];
  });

  // Funding figures follow whichever period the transaction will actually be
  // filed under - refetch when the date-budget checkbox targets a different
  // period than the one `fundingContext` was computed for at page load.
  const [fetchedFundingContext, setFetchedFundingContext] = useState<Props["fundingContext"]>();
  const [fundingContextLoading, setFundingContextLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: transaction ? String((transaction.nativeCurrencyId && transaction.nativeAmount ? transaction.nativeAmount : transaction.amount) / 100) : "",
      categoryId: transaction?.categoryId ?? "",
      description: transaction?.description ?? "",
      notes: transaction?.notes ?? "",
      date: transaction ? format(new Date(transaction.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      isRecurring: transaction?.isRecurring ?? false,
      recurringFrequency: transaction?.recurringFrequency ?? "",
      tags: transaction?.tags ?? "",
      isRegretPurchase: transaction?.isRegretPurchase ?? false,
    },
  });

  const watchedAmount = watch("amount");
  const amountPreview = watchedAmount?.trim() ? evaluateAmount(watchedAmount) : null;
  const watchedDate = watch("date");
  const budget = selectedCategory && defaultType === "EXPENSE" ? budgetByCategoryId[selectedCategory] : null;
  const remaining = budget ? budget.allocated - budget.spent : null;
  const isOverBudget = remaining !== null && remaining < 0;
  // Owned by a loan/investment: only the descriptive fields can change here.
  const owned = !!(transaction?.loanPrincipalOf || transaction?.loanPaymentOf || transaction?.investmentContributionOf);
  const showCurrencyToggle = defaultType === "INCOME" && !transaction && currencies.length > 1;
  const editingNativeIncome = defaultType === "INCOME" && !!transaction?.nativeCurrencyId;
  const selectedCurrency = currencies.find((c) => c.id === incomeCurrencyId) ?? baseCurrency;
  const isNativeIncome = (showCurrencyToggle && incomeCurrencyId !== baseCurrency.id) || editingNativeIncome;
  // The period this entry sits in: its own when editing, else the page's open period.
  const homePeriod = transaction ? { month: transaction.budgetMonth ?? currentPeriod?.month ?? 0, year: transaction.budgetYear ?? currentPeriod?.year ?? 0 } : currentPeriod;
  // Resolved target period: the date-derived period when the checkbox is on, otherwise the home period.
  const targetPeriod = fileUnderDateBudget && watchedDate ? monthYearFromDateStr(watchedDate) : homePeriod;
  const isCurrentPeriod = !!targetPeriod && !!currentPeriod && targetPeriod.month === currentPeriod.month && targetPeriod.year === currentPeriod.year;
  const rawFundingContext = isCurrentPeriod ? fundingContext : (fetchedFundingContext ?? fundingContext);
  // When editing, what this expense already holds is given back so "available" is what it can really use.
  const liveFundingContext = transaction && rawFundingContext && defaultType === "EXPENSE" && targetPeriod
    && targetPeriod.month === transaction.budgetMonth && targetPeriod.year === transaction.budgetYear
    ? restoreFunding(rawFundingContext, transaction)
    : rawFundingContext;
  const fundingOptions = buildFundingOptions(liveFundingContext, baseCurrency.symbol);

  useEffect(() => {
    if (defaultType !== "EXPENSE" || owned || !fundingContext || !targetPeriod || isCurrentPeriod) return;
    let cancelled = false;
    setFundingContextLoading(true);
    getExpenseFundingContext(targetPeriod.month, targetPeriod.year)
      .then((ctx) => { if (!cancelled) setFetchedFundingContext(ctx); })
      .finally(() => { if (!cancelled) setFundingContextLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPeriod?.month, targetPeriod?.year, defaultType, owned, isCurrentPeriod]);

  // Build splitSources payload for submit
  function buildSplitPayload(totalAmount: number): {
    splitSources: { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string; pkrAmount: number }[];
  } | null {
    if (!useSplit || splitSources.length < 2) return null;
    const totalPaisas = Math.round(totalAmount * 100);
    const allocatedBeforeLast = splitSources.slice(0, -1).reduce((s, src) => s + (Math.round(parseFloat(src.pkrAmount || "0") * 100) || 0), 0);
    const lastPkrAmount = totalPaisas - allocatedBeforeLast;
    const sources = splitSources.map((src, idx) => {
      const parsed = parseFundingValue(src.value);
      const pkrAmount = idx === splitSources.length - 1 ? lastPkrAmount : Math.round(parseFloat(src.pkrAmount || "0") * 100);
      return { ...parsed, pkrAmount };
    });
    return { splitSources: sources };
  }

  // Blank description -> the category's name, same as the phone app.
  function descriptionFor(data: FormValues): string {
    return data.description?.trim() || allCategories.find((c) => c.id === data.categoryId)?.name || (defaultType === "INCOME" ? "Income" : "Expense");
  }

  async function submitTransaction(data: FormValues) {
    setLoading(true);
    try {
      const rawAmount = amountOf(data.amount);
      const pkrAmount = isNativeIncome ? rawAmount * nativeRate : rawAmount;

      const splitPayload = defaultType === "EXPENSE" && !owned ? buildSplitPayload(pkrAmount) : null;
      const dateOverride = monthYearFromDateStr(data.date);

      let singleFunding: { fundingSource: string; fundingPotId?: string; fundingCurrencyId?: string } = {
        fundingSource: "INCOME",
      };
      if (defaultType === "EXPENSE" && !splitPayload && !owned) {
        const parsed = parseFundingValue(singleFundingValue);
        singleFunding = {
          fundingSource: parsed.source,
          fundingPotId: parsed.potId,
          fundingCurrencyId: parsed.currencyId,
        };
      }

      const base = {
        amount: pkrAmount,
        type: defaultType,
        categoryId: data.categoryId,
        description: descriptionFor(data),
        notes: data.notes,
        date: data.date,
        isRecurring: data.isRecurring,
        recurringFrequency: data.recurringFrequency || undefined,
        tags: data.tags ?? "",
        isRegretPurchase: defaultType === "EXPENSE" ? data.isRegretPurchase : false,
        ...(fileUnderDateBudget ? { budgetMonth: dateOverride.month, budgetYear: dateOverride.year } : {}),
        ...(isNativeIncome ? { nativeCurrencyId: incomeCurrencyId, nativeAmount: rawAmount } : {}),
        ...singleFunding,
        ...(splitPayload ?? {}),
      };

      if (transaction) {
        const result = await updateTransaction(transaction.id, { ...base, amount: pkrAmount });
        if (result.success) { toast.success("Transaction updated"); onSuccess(); }
        else toast.error(result.error ?? "Something went wrong");
        return;
      }

      const result = await createTransaction(base);
      if (result.success) { toast.success("Transaction added"); onSuccess(); }
      else toast.error(result.error ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: FormValues) {
    const amount = amountOf(data.amount);
    if (!transaction && defaultType === "EXPENSE" && amount >= IMPULSE_THRESHOLD) {
      setImpulseCheck({ data });
      return;
    }
    await submitTransaction(data);
  }

  async function handleParkInWantList() {
    if (!impulseCheck) return;
    setLoading(true);
    const result = await addToWantList({
      name: descriptionFor(impulseCheck.data),
      estimatedCost: amountOf(impulseCheck.data.amount),
      coolingHours: 48,
    });
    if (result.success) {
      toast.success("Parked in Want List - sleep on it first!");
      setImpulseCheck(null);
      onSuccess();
    } else {
      toast.error(result.error ?? "Failed to park");
    }
    setLoading(false);
  }

  // ─── impulse check screen ──────────────────────────────────────────────────

  if (impulseCheck) {
    const amount = amountOf(impulseCheck.data.amount);
    return (
      <div className="space-y-5">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-5 text-center space-y-2">
          <div className="text-3xl">⏸️</div>
          <div className="font-bold text-lg text-foreground">Hold on - big spend!</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{baseCurrency.symbol} {amount.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">
            Was <span className="font-medium">"{descriptionFor(impulseCheck.data)}"</span> planned, or did it just pop into your head?
          </p>
        </div>
        <div className="space-y-3">
          <Button type="button" className="w-full" onClick={() => { setImpulseCheck(null); submitTransaction(impulseCheck.data); }} disabled={loading}>
            <CheckCircle className="h-4 w-4 mr-2" />Yes, it was planned - record it
          </Button>
          <Button type="button" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50" onClick={handleParkInWantList} disabled={loading}>
            <ShoppingCart className="h-4 w-4 mr-2" />Not sure - park it in Want List first
          </Button>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setImpulseCheck(null)}>
            Go back and edit
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">The Want List lets you revisit this in 48 hours with a clearer head.</p>
      </div>
    );
  }

  // ─── main form ─────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {owned && (
        <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-xs text-muted-foreground">
          This entry belongs to a loan or investment. Its amount, funding and budget period are changed there; you can still edit the details below.
        </div>
      )}

      {/* Amount + currency toggle */}
      {(
        <FormSection title="Amount">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount ({selectedCurrency.symbol} {selectedCurrency.code})</Label>
              {showCurrencyToggle && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-xs flex-wrap">
                  {currencies.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setIncomeCurrencyId(c.id); setNativeRate(c.rateToBase); }}
                      className={cn("px-2 py-1 rounded-md font-semibold transition-colors", incomeCurrencyId === c.id ? "bg-background shadow text-foreground" : "text-muted-foreground")}>
                      {c.symbol} {c.code}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input id="amount" type="text" inputMode="decimal" autoComplete="off" autoFocus={!transaction} disabled={owned} placeholder="0.00 or a sum like 35+67" className="text-lg font-semibold" {...register("amount")} />
            {errors.amount ? (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            ) : amountPreview?.ok && amountPreview.isExpression ? (
              <p className="text-xs text-muted-foreground px-1">= {selectedCurrency.symbol} {amountPreview.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            ) : null}
            {isNativeIncome && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium shrink-0">1 {selectedCurrency.code} =</span>
                <input type="number" step="0.01" value={nativeRate}
                  onChange={(e) => setNativeRate(parseFloat(e.target.value) || selectedCurrency.rateToBase)}
                  className="w-24 text-xs font-semibold bg-transparent border-b border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 focus:outline-none" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">{baseCurrency.code}</span>
                <span className="text-xs text-blue-500 ml-auto">≈ {baseCurrency.symbol} {(amountOf(watchedAmount) * nativeRate).toLocaleString()}</span>
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* What: category, then an optional description */}
      <FormSection title="What">
        <div className="space-y-1">
          <Label>Category</Label>
          <CategoryCombobox
            categories={allCategories}
            value={selectedCategory}
            type={defaultType}
            invalid={!!errors.categoryId}
            onChange={(id) => { setValue("categoryId", id, { shouldValidate: true }); setSelectedCategory(id); }}
            onCreated={(c) => setCreatedCategories((prev) => [...prev, c])}
          />
          {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          {budget && remaining !== null && (
            <div className={cn("flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg", isOverBudget ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300")}>
              {isOverBudget ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
              {isOverBudget
                ? `${baseCurrency.symbol} ${(Math.abs(remaining) / 100).toLocaleString()} over budget this month`
                : `${baseCurrency.symbol} ${(remaining / 100).toLocaleString()} remaining in budget this month`}
            </div>
          )}
          {defaultType === "EXPENSE" && selectedCategory && !budget && (
            <p className="text-xs text-muted-foreground px-1">No budget set for this category this month</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="description" placeholder="What was this for?" {...register("description")} />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>
      </FormSection>

      {/* When: date + budget-period checkbox, right next to each other */}
      {(
        <FormSection title="When">
          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" lang={dateFormatToLang(dateFormat)} {...register("date")} />
          </div>
          {!owned && (
            <BudgetPeriodOverride
              date={watchedDate}
              checked={fileUnderDateBudget}
              onChange={setFileUnderDateBudget}
              affectsFunding={defaultType === "EXPENSE"}
              otherwise={transaction ? `Otherwise stays under ${getMonthName(transaction.budgetMonth ?? 0)} ${transaction.budgetYear}'s budget` : undefined}
            />
          )}
        </FormSection>
      )}

      {/* Funding - only for new expenses with funding context */}
      {defaultType === "EXPENSE" && fundingContext && !owned && (
        <FormSection title="Funding">
          <div className={cn("space-y-2 transition-opacity", fundingContextLoading && "opacity-60")}>
            {!useSplit ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Pay from</Label>
                  <button type="button" onClick={() => { setUseSplit(true); setSplitSources([{ value: singleFundingValue, pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]); }}
                    className="text-xs text-primary hover:underline font-medium">
                    + Split across two sources
                  </button>
                </div>
                <FundingSelect value={singleFundingValue} onChange={setSingleFundingValue} options={fundingOptions} />
                <p className="text-xs text-muted-foreground px-1">
                  Choosing a savings pot deducts immediately and is reversed if you delete this expense.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pay from (split)</Label>
                  <button type="button" onClick={() => { setUseSplit(false); setSingleFundingValue("INCOME"); }}
                    className="text-xs text-muted-foreground hover:underline">
                    Use single source
                  </button>
                </div>
                <SplitFunding
                  totalAmount={amountOf(watchedAmount)}
                  options={fundingOptions}
                  value={splitSources}
                  onChange={setSplitSources}
                  baseSymbol={baseCurrency.symbol}
                />
              </div>
            )}
          </div>
        </FormSection>
      )}

      <MoreOptions>
        <div className="space-y-1">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" rows={2} placeholder="Additional details..." {...register("notes")} />
        </div>

        {defaultType === "EXPENSE" && (
          <div className="flex items-center gap-2">
            <Checkbox id="regret" checked={isRegretPurchase} onCheckedChange={(v) => { const c = !!v; setIsRegretPurchase(c); setValue("isRegretPurchase", c); }} />
            <Label htmlFor="regret" className="cursor-pointer">Regret buy - wish I hadn't</Label>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(v) => { const c = !!v; setIsRecurring(c); setValue("isRecurring", c); }} />
          <Label htmlFor="recurring" className="cursor-pointer">Recurring transaction</Label>
        </div>
        {isRecurring && (
          <div className="space-y-1">
            <Label>Frequency</Label>
            <Select onValueChange={(v) => setValue("recurringFrequency", v)} defaultValue={transaction?.recurringFrequency ?? "MONTHLY"}>
              <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Recurring transactions need to be added manually each month.</p>
          </div>
        )}
      </MoreOptions>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : transaction ? "Save Changes" : "Add Transaction"}
      </Button>
    </form>
  );
}
