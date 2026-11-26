"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTransaction, getExpenseFundingContext, updateTransaction } from "@/actions/expenses";
import { BudgetPeriodOverride, monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { FormSection } from "@/components/shared/form-section";
import { addToWantList } from "@/actions/want-list";
import { cn, getMonthName } from "@/lib/utils";
import { DayStrip } from "@/components/shared/day-strip";
import { LAST_ENTRY_DATE_KEY, readLastUsed, rememberEntryDate, toDateStr } from "@/lib/day-strip";
import { matchDescriptions } from "@/lib/expenses/quick-picks";
import type { QuickPicks } from "@/actions/expenses";
import { evaluateAmount } from "@/lib/amount-expr";
import { dateFormatToLang } from "@/lib/date-lang";
import { readLastCategory, rememberCategory } from "@/lib/last-category";
import { AmountField } from "@/components/expenses/amount-field";
import { ExtraOptions } from "@/components/expenses/extra-options";
import { CategoryField } from "@/components/expenses/category-field";
import { DescriptionField } from "@/components/expenses/description-field";
import { FundingSection } from "@/components/expenses/funding-section";
import { ImpulseStep } from "@/components/expenses/impulse-step";
import {
  IMPULSE_THRESHOLD, amountOf, buildFundingOptions, buildSplitPayload, fundingValueFromTransaction, parseFundingValue, restoreFunding, schema,
  type FormValues, type Props, type SplitSource,
} from "@/components/expenses/transaction-form-helpers";

export function TransactionForm({
  defaultType, categories, transaction, budgetByCategoryId = {},
  currencies = [], fundingContext, currentPeriod, dateFormat = "dd/MM/yyyy", quickPicks, onDirtyChange, onSuccess,
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
  const [impulseCheck, setImpulseCheck] = useState<{ data: FormValues; again: boolean } | null>(null);
  const isNew = !transaction;
  // Entries saved with "Add another" in this dialog: shown as a running tally.
  const [batch, setBatch] = useState({ count: 0, total: 0 });
  // A recent date from the last entry saved (within 3 hours) - offered as the first chip, never preselected.
  const [lastUsedDate] = useState<string | null>(() => (isNew && typeof window !== "undefined" ? readLastUsed(window.localStorage.getItem(LAST_ENTRY_DATE_KEY), new Date()) : null));
  // The category last used for this type: highlighted first chip, kept across an "Add another" batch.
  const [lastCategoryId, setLastCategoryId] = useState<string | null>(() => {
    const id = isNew ? readLastCategory(defaultType) : null;
    return id && categories.some((c) => c.id === id) ? id : null;
  });
  const [showFundingControls, setShowFundingControls] = useState(false);
  const [isMac] = useState(() => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent));
  const amountRef = useRef<HTMLInputElement | null>(null);
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
  const [fetched, setFetched] = useState<{ key: string; ctx: Props["fundingContext"] }>();

  const { register, handleSubmit, setValue, control, clearErrors, formState: { errors } } = useForm<FormValues>({
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

  const amountReg = register("amount");
  const watchedAmount = useWatch({ control, name: "amount" });
  const watchedDescription = useWatch({ control, name: "description" }) ?? "";
  const watchedNotes = useWatch({ control, name: "notes" }) ?? "";
  const watchedDate = useWatch({ control, name: "date" });
  const amountPreview = watchedAmount?.trim() ? evaluateAmount(watchedAmount) : null;
  const budget = selectedCategory && defaultType === "EXPENSE" ? budgetByCategoryId[selectedCategory] ?? null : null;
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
  const targetMonth = targetPeriod?.month;
  const targetYear = targetPeriod?.year;
  const isCurrentPeriod = !!targetPeriod && !!currentPeriod && targetPeriod.month === currentPeriod.month && targetPeriod.year === currentPeriod.year;
  const targetKey = `${targetMonth}-${targetYear}`;
  const needsFetch = defaultType === "EXPENSE" && !owned && !!fundingContext && targetMonth !== undefined && !isCurrentPeriod;
  const fundingContextLoading = needsFetch && fetched?.key !== targetKey;
  const rawFundingContext = isCurrentPeriod ? fundingContext : (fetched?.ctx ?? fundingContext);
  // When editing, what this expense already holds is given back so "available" is what it can really use.
  const liveFundingContext = transaction && rawFundingContext && defaultType === "EXPENSE" && targetPeriod
    && targetPeriod.month === transaction.budgetMonth && targetPeriod.year === transaction.budgetYear
    ? restoreFunding(rawFundingContext, transaction)
    : rawFundingContext;
  const fundingOptions = buildFundingOptions(liveFundingContext, baseCurrency.symbol);
  // The "count it in that month" choice only matters when the date is in another period.
  const dateInOtherPeriod = !!homePeriod && !!watchedDate && (() => {
    const p = monthYearFromDateStr(watchedDate);
    return p.month !== homePeriod.month || p.year !== homePeriod.year;
  })();
  const incomeLeft = liveFundingContext?.monthlyIncomeAvailable ?? 0;
  const incomeEnough = incomeLeft > 0 && Math.round(amountOf(watchedAmount) * 100) <= incomeLeft;
  const fundingCollapsed = isNew && !useSplit && singleFundingValue === "INCOME" && incomeEnough && !showFundingControls;
  // Quick chips: the last used category first, then the most used ones.
  const chipIds = [...(lastCategoryId ? [lastCategoryId] : []), ...(quickPicks?.topCategoryIds ?? []).filter((id) => id !== lastCategoryId)];
  const categoryChips = isNew
    ? chipIds.map((id) => allCategories.find((c) => c.id === id)).filter((c): c is Props["categories"][number] => !!c)
    : [];
  const [initial] = useState(() => ({
    amount: transaction ? String((transaction.nativeCurrencyId && transaction.nativeAmount ? transaction.nativeAmount : transaction.amount) / 100) : "",
    description: transaction?.description ?? "",
    categoryId: transaction?.categoryId ?? "",
    notes: transaction?.notes ?? "",
  }));
  // After "Add another" the kept category alone is not unsaved work.
  const dirty = watchedAmount !== initial.amount || watchedDescription !== initial.description
    || (batch.count === 0 && selectedCategory !== initial.categoryId) || watchedNotes !== initial.notes;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const descSuggestions = isNew ? matchDescriptions(quickPicks?.descriptions ?? [], watchedDescription) : [];

  function chooseCategory(id: string) {
    setValue("categoryId", id, { shouldValidate: true });
    setSelectedCategory(id);
  }

  function applyRepeat(p: NonNullable<QuickPicks>["repeats"][number]) {
    setValue("description", p.description);
    if (allCategories.some((c) => c.id === p.categoryId)) chooseCategory(p.categoryId);
    setValue("amount", String(p.lastAmount / 100), { shouldValidate: true });
    if (defaultType === "INCOME") { setIncomeCurrencyId(baseCurrency.id); setNativeRate(baseCurrency.rateToBase); }
    if (defaultType === "EXPENSE" && p.fundingSource === "SAVINGS_POT" && p.fundingPotId && p.fundingCurrencyId) {
      const value = `POT:${p.fundingPotId}:${p.fundingCurrencyId}`;
      if (fundingOptions.some((o) => o.value === value)) { setUseSplit(false); setSingleFundingValue(value); }
    }
    setTimeout(() => { amountRef.current?.focus(); amountRef.current?.select(); }, 0);
  }

  function chooseDescription(d: { description: string; categoryId: string }) {
    setValue("description", d.description);
    if (!selectedCategory && allCategories.some((c) => c.id === d.categoryId)) chooseCategory(d.categoryId);
  }

  useEffect(() => {
    if (!needsFetch || targetMonth === undefined || targetYear === undefined) return;
    let cancelled = false;
    getExpenseFundingContext(targetMonth, targetYear).then((ctx) => { if (!cancelled) setFetched({ key: `${targetMonth}-${targetYear}`, ctx }); });
    return () => { cancelled = true; };
  }, [needsFetch, targetMonth, targetYear]);

  // Blank description -> the category's name, same as the phone app.
  function descriptionFor(data: FormValues): string {
    return data.description?.trim() || allCategories.find((c) => c.id === data.categoryId)?.name || (defaultType === "INCOME" ? "Income" : "Expense");
  }

  async function submitTransaction(data: FormValues, again = false) {
    setLoading(true);
    try {
      const rawAmount = amountOf(data.amount);
      const pkrAmount = isNativeIncome ? rawAmount * nativeRate : rawAmount;

      const splitPayload = defaultType === "EXPENSE" && !owned ? buildSplitPayload(useSplit, splitSources, pkrAmount) : null;
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
        if (result.success) { toast.success("Saved"); onSuccess(); }
        else toast.error(result.error ?? "Something went wrong");
        return;
      }

      const result = await createTransaction(base);
      if (!result.success) { toast.error(result.error ?? "Something went wrong"); return; }
      rememberEntryDate(data.date, new Date());
      rememberCategory(defaultType, data.categoryId);
      toast.success(`Added ${descriptionFor(data)} · ${selectedCurrency.symbol} ${rawAmount.toLocaleString()}`);
      if (!again) { onSuccess(); return; }
      // Next item from the same day / shop: keep date, funding and category; clear the rest.
      setBatch((b) => ({ count: b.count + 1, total: b.total + pkrAmount }));
      setLastCategoryId(data.categoryId);
      setValue("amount", ""); setValue("description", ""); setValue("notes", ""); setValue("isRegretPurchase", false);
      setIsRegretPurchase(false);
      setSplitSources((prev) => prev.map((s) => ({ ...s, pkrAmount: "" })));
      clearErrors();
      setTimeout(() => amountRef.current?.focus(), 0);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: FormValues, again = false) {
    // Only a same-day big expense gets the "was this planned?" pause (a backdated one already happened),
    // and never again within an "Add another" batch.
    if (isNew && defaultType === "EXPENSE" && batch.count === 0 && data.date === toDateStr(new Date()) && amountOf(data.amount) >= IMPULSE_THRESHOLD) {
      setImpulseCheck({ data, again });
      return;
    }
    await submitTransaction(data, again);
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

  if (impulseCheck) {
    return (
      <ImpulseStep
        symbol={baseCurrency.symbol}
        amount={amountOf(impulseCheck.data.amount)}
        description={descriptionFor(impulseCheck.data)}
        loading={loading}
        onConfirm={() => { const { data, again } = impulseCheck; setImpulseCheck(null); void submitTransaction(data, again); }}
        onPark={handleParkInWantList}
        onBack={() => setImpulseCheck(null)}
      />
    );
  }

  const addAnother = () => { void handleSubmit((d) => onSubmit(d, true))(); };

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d, false))}
      onKeyDown={(e) => {
        // Ctrl/Cmd+Enter: save and add another (new entries only).
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && isNew && !loading) {
          e.preventDefault();
          addAnother();
        }
      }}
      className="space-y-4 min-w-0"
    >

      {isNew && quickPicks && quickPicks.repeats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickPicks.repeats.map((p) => (
            <button
              key={`${p.categoryId}:${p.description}`}
              type="button"
              onClick={() => applyRepeat(p)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted transition-colors"
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.categoryColor }} />
              {p.description} · {baseCurrency.symbol} {(p.lastAmount / 100).toLocaleString()}
            </button>
          ))}
        </div>
      )}

      {owned && (
        <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-xs text-muted-foreground">
          This entry belongs to a loan or investment. Its amount, funding and budget period are changed there; you can still edit the details below.
        </div>
      )}

      <AmountField
        reg={amountReg}
        inputRef={(el) => { amountReg.ref(el); amountRef.current = el; }}
        autoFocus={isNew}
        disabled={owned}
        error={errors.amount?.message}
        preview={amountPreview?.ok && amountPreview.isExpression ? amountPreview.value : null}
        currency={selectedCurrency}
        baseCurrency={baseCurrency}
        currencies={currencies}
        showToggle={showCurrencyToggle}
        onCurrencyChange={(c) => { setIncomeCurrencyId(c.id); setNativeRate(c.rateToBase); }}
        isNative={isNativeIncome}
        rate={nativeRate}
        onRateChange={setNativeRate}
        baseValue={amountOf(watchedAmount) * nativeRate}
      />

      <DayStrip
        value={watchedDate}
        onChange={(d) => setValue("date", d, { shouldDirty: true })}
        lastUsed={lastUsedDate}
        lang={dateFormatToLang(dateFormat)}
      />

      {/* What: category, then an optional description */}
      <FormSection title="What">
        <CategoryField
          categories={allCategories}
          chips={categoryChips}
          lastUsedId={lastCategoryId}
          value={selectedCategory}
          type={defaultType}
          invalid={!!errors.categoryId}
          error={errors.categoryId?.message}
          budget={budget}
          symbol={baseCurrency.symbol}
          showNoBudget={defaultType === "EXPENSE" && !!selectedCategory}
          onChange={chooseCategory}
          onCreated={(c) => setCreatedCategories((prev) => [...prev, c])}
        />
        <DescriptionField reg={register("description")} suggestions={descSuggestions} error={errors.description?.message} onPick={chooseDescription} />
      </FormSection>

      {/* When: the budget-period checkbox, only if the date is in another period */}
      {!owned && (dateInOtherPeriod || fileUnderDateBudget) && (
        <FormSection title="When">
          <BudgetPeriodOverride
            compact
            date={watchedDate}
            checked={fileUnderDateBudget}
            onChange={setFileUnderDateBudget}
            affectsFunding={defaultType === "EXPENSE"}
            otherwise={transaction ? `Otherwise stays under ${getMonthName(transaction.budgetMonth ?? 0)} ${transaction.budgetYear}'s budget` : undefined}
          />
        </FormSection>
      )}

      {defaultType === "EXPENSE" && fundingContext && !owned && (
        <FundingSection
          options={fundingOptions}
          loading={fundingContextLoading}
          collapsed={fundingCollapsed}
          isNew={isNew}
          symbol={baseCurrency.symbol}
          incomeLeft={incomeLeft}
          totalAmount={amountOf(watchedAmount)}
          useSplit={useSplit}
          single={singleFundingValue}
          splitSources={splitSources}
          onShowControls={() => setShowFundingControls(true)}
          onSingleChange={setSingleFundingValue}
          onSplitSourcesChange={setSplitSources}
          onUseSplit={(split) => {
            setUseSplit(split);
            if (split) setSplitSources([{ value: singleFundingValue, pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
            else setSingleFundingValue("INCOME");
          }}
        />
      )}

      <ExtraOptions
        notesProps={register("notes")}
        showRegret={defaultType === "EXPENSE"}
        regret={isRegretPurchase}
        onRegret={(c) => { setIsRegretPurchase(c); setValue("isRegretPurchase", c); }}
        recurring={isRecurring}
        onRecurring={(c) => { setIsRecurring(c); setValue("isRecurring", c); }}
        frequency={transaction?.recurringFrequency ?? "MONTHLY"}
        onFrequency={(v) => setValue("recurringFrequency", v)}
      />

      {batch.count > 0 && (
        <p className="text-xs text-muted-foreground text-center" aria-live="polite">
          Added {batch.count} · {baseCurrency.symbol} {batch.total.toLocaleString()}
        </p>
      )}

      <div className="flex gap-2">
        {isNew && (
          <Button type="button" variant="outline" disabled={loading} onClick={addAnother} className="shrink-0">
            Add another
            <kbd className="ml-1 hidden sm:inline rounded border border-border bg-muted px-1 text-[10px] font-sans text-muted-foreground">{isMac ? "⌘↵" : "Ctrl+↵"}</kbd>
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : transaction ? "Save changes" : defaultType === "INCOME" ? "Add income" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
