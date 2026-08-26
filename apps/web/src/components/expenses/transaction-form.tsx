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
import { cn } from "@/lib/utils";

// ─── types ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  amount: z.string().min(1, "Amount is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
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
    fundingSources?: { priority: number; source: string; potId: string | null; currencyId: string | null; pkrAmount: number; pot?: { id: string; name: string; type: string } | null }[];
  } | null;
  budgetByCategoryId?: Record<string, { allocated: number; spent: number }>;
  // Prefills a NEW (non-edit) transaction from a cash-flow planner row - all fields
  // stay editable, unlike `transaction` (which locks amount/date/funding on edit).
  initialValues?: { amount?: number; categoryId?: string; description?: string; date?: string };
  // Links the created transaction back to the planner row it books - see
  // createTransaction's linkPlannedExpenseId/linkRecurringIncomeId.
  linkPlannedExpenseId?: string;
  linkRecurringIncomeId?: string;
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

// ─── main component ────────────────────────────────────────────────────────────

export function TransactionForm({
  defaultType, categories, transaction, budgetByCategoryId = {}, initialValues,
  linkPlannedExpenseId, linkRecurringIncomeId,
  currencies = [], fundingContext, currentPeriod, dateFormat = "dd/MM/yyyy", onSuccess,
}: Props) {
  const baseCurrency = currencies.find((c) => c.isBase) ?? { id: "", code: "PKR", symbol: "Rs", rateToBase: 1, isBase: true };
  const [loading, setLoading] = useState(false);
  const [fileUnderDateBudget, setFileUnderDateBudget] = useState(false);
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring ?? false);
  const [isRegretPurchase, setIsRegretPurchase] = useState(transaction?.isRegretPurchase ?? false);
  const [selectedCategory, setSelectedCategory] = useState(transaction?.categoryId ?? initialValues?.categoryId ?? "");
  const [impulseCheck, setImpulseCheck] = useState<{ data: FormValues } | null>(null);
  const [incomeCurrencyId, setIncomeCurrencyId] = useState(baseCurrency.id);
  const [nativeRate, setNativeRate] = useState(baseCurrency.rateToBase);

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
      amount: transaction ? String(transaction.amount / 100) : initialValues?.amount != null ? String(initialValues.amount / 100) : "",
      categoryId: transaction?.categoryId ?? initialValues?.categoryId ?? "",
      description: transaction?.description ?? initialValues?.description ?? "",
      notes: transaction?.notes ?? "",
      date: transaction ? format(new Date(transaction.date), "yyyy-MM-dd") : initialValues?.date ?? format(new Date(), "yyyy-MM-dd"),
      isRecurring: transaction?.isRecurring ?? false,
      recurringFrequency: transaction?.recurringFrequency ?? "",
      tags: transaction?.tags ?? "",
      isRegretPurchase: transaction?.isRegretPurchase ?? false,
    },
  });

  const watchedAmount = watch("amount");
  const watchedDate = watch("date");
  const budget = selectedCategory && defaultType === "EXPENSE" ? budgetByCategoryId[selectedCategory] : null;
  const remaining = budget ? budget.allocated - budget.spent : null;
  const isOverBudget = remaining !== null && remaining < 0;
  const isEditingExpense = !!transaction && defaultType === "EXPENSE";
  const showCurrencyToggle = defaultType === "INCOME" && !transaction && currencies.length > 1;
  const selectedCurrency = currencies.find((c) => c.id === incomeCurrencyId) ?? baseCurrency;
  const isNativeIncome = showCurrencyToggle && incomeCurrencyId !== baseCurrency.id;
  // Resolved target period: the date-derived period when the checkbox is on,
  // otherwise the page's current open period.
  const targetPeriod = fileUnderDateBudget && watchedDate ? monthYearFromDateStr(watchedDate) : currentPeriod;
  const isCurrentPeriod = !!targetPeriod && !!currentPeriod && targetPeriod.month === currentPeriod.month && targetPeriod.year === currentPeriod.year;
  const liveFundingContext = isCurrentPeriod ? fundingContext : (fetchedFundingContext ?? fundingContext);
  const fundingOptions = buildFundingOptions(liveFundingContext, baseCurrency.symbol);

  useEffect(() => {
    if (defaultType !== "EXPENSE" || isEditingExpense || !fundingContext || !targetPeriod || isCurrentPeriod) return;
    let cancelled = false;
    setFundingContextLoading(true);
    getExpenseFundingContext(targetPeriod.month, targetPeriod.year)
      .then((ctx) => { if (!cancelled) setFetchedFundingContext(ctx); })
      .finally(() => { if (!cancelled) setFundingContextLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPeriod?.month, targetPeriod?.year, defaultType, isEditingExpense, isCurrentPeriod]);

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

  async function submitTransaction(data: FormValues) {
    setLoading(true);
    try {
      const rawAmount = parseFloat(data.amount);
      const pkrAmount = isNativeIncome ? rawAmount * nativeRate : rawAmount;

      const splitPayload = defaultType === "EXPENSE" && !isEditingExpense ? buildSplitPayload(pkrAmount) : null;
      const dateOverride = monthYearFromDateStr(data.date);

      let singleFunding: { fundingSource: string; fundingPotId?: string; fundingCurrencyId?: string } = {
        fundingSource: "INCOME",
      };
      if (defaultType === "EXPENSE" && !splitPayload) {
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
        description: data.description,
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
        ...(!transaction && linkPlannedExpenseId ? { linkPlannedExpenseId } : {}),
        ...(!transaction && linkRecurringIncomeId ? { linkRecurringIncomeId } : {}),
      };

      if (transaction) {
        const result = await updateTransaction(transaction.id, { ...base, amount: rawAmount });
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
    const amount = parseFloat(data.amount);
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
      name: impulseCheck.data.description,
      estimatedCost: parseFloat(impulseCheck.data.amount),
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
    const amount = parseFloat(impulseCheck.data.amount);
    return (
      <div className="space-y-5">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-5 text-center space-y-2">
          <div className="text-3xl">⏸️</div>
          <div className="font-bold text-lg text-foreground">Hold on - big spend!</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{baseCurrency.symbol} {amount.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">
            Was <span className="font-medium">"{impulseCheck.data.description}"</span> planned, or did it just pop into your head?
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

      {/* Edit mode - locked summary */}
      {isEditingExpense && (
        <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Locked</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
              <p className="font-semibold">{baseCurrency.symbol} {fmtMoney(transaction.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Date</p>
              <p className="font-semibold">{format(new Date(transaction.date), dateFormat)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Funded by</p>
              {transaction.fundingSource === "SPLIT" && transaction.fundingSources?.length ? (
                <div className="space-y-0.5">
                  {[...transaction.fundingSources]
                    .sort((a, b) => a.priority - b.priority)
                    .map((s, i) => (
                      <p key={i} className="font-semibold text-xs">
                        {s.source === "INCOME" ? "Income" : s.pot?.name ?? "Savings pot"}
                        {" · "}{baseCurrency.symbol} {fmtMoney(s.pkrAmount)}
                      </p>
                    ))}
                </div>
              ) : (
                <p className="font-semibold">{transaction.fundingSource === "SAVINGS_POT" ? "Savings pot" : "Income"}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">To change amount, date, or funding - delete and re-add.</p>
        </div>
      )}

      {/* What: description + category */}
      <FormSection title="What">
        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Input id="description" placeholder="What was this for?" {...register("description")} />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Category</Label>
          <Select onValueChange={(v) => { setValue("categoryId", v); setSelectedCategory(v); }} defaultValue={transaction?.categoryId}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </FormSection>

      {/* Amount + currency toggle */}
      {!isEditingExpense && (
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
            <Input id="amount" type="number" step="0.01" placeholder="0.00" className="text-lg font-semibold" {...register("amount")} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            {isNativeIncome && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium shrink-0">1 {selectedCurrency.code} =</span>
                <input type="number" step="0.01" value={nativeRate}
                  onChange={(e) => setNativeRate(parseFloat(e.target.value) || selectedCurrency.rateToBase)}
                  className="w-24 text-xs font-semibold bg-transparent border-b border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 focus:outline-none" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">{baseCurrency.code}</span>
                <span className="text-xs text-blue-500 ml-auto">≈ {baseCurrency.symbol} {((parseFloat(watchedAmount) || 0) * nativeRate).toLocaleString()}</span>
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* When: date + budget-period checkbox, right next to each other */}
      {!isEditingExpense && (
        <FormSection title="When">
          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" lang={dateFormatToLang(dateFormat)} {...register("date")} />
          </div>
          <BudgetPeriodOverride
            date={watchedDate}
            checked={fileUnderDateBudget}
            onChange={setFileUnderDateBudget}
            affectsFunding={defaultType === "EXPENSE"}
          />
        </FormSection>
      )}

      {/* Funding - only for new expenses with funding context */}
      {defaultType === "EXPENSE" && fundingContext && !isEditingExpense && (
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
                  totalAmount={parseFloat(watchedAmount) || 0}
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
