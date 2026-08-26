"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Copy, TrendingUp, TrendingDown, AlertTriangle, Loader2, PiggyBank, CheckCircle2, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { upsertBudget, copyPreviousMonthBudget, startNewBudgetPeriod } from "@/actions/budget";
import { getMonthName } from "@/lib/utils";
import { nextPeriod } from "@/lib/month";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Category { id: string; name: string; color: string; type: string; }

interface BudgetCategory {
  id: string; categoryId: string; allocatedAmount: number;
  spent: number; available: number; percentage: number;
  category: { id: string; name: string; color: string; icon: string };
}

interface UnbudgetedExpense {
  id: string; description: string; amount: number; categoryId: string;
  category: { name: string; color: string };
}

interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
interface PotBalance { amount: number; currency: CurrencyLite; }
interface Pot {
  id: string; name: string; type: string;
  balances: PotBalance[];
}

interface SavingsAllocation { potId: string; potName: string; potType: string; amount: number; }

interface BudgetData {
  budget: { id: string; totalBudget: number } | null;
  totalSpent: number;
  totalIncome: number;
  unbudgetedExpenses: UnbudgetedExpense[];
  unbudgetedTotal: number;
  spendingByCategory: Record<string, number>;
  readyToAssign: number;
  totalAssigned: number;
  totalPlannedSavings: number;
  pots: Pot[];
  savingsAllocations: SavingsAllocation[];
  categories: BudgetCategory[];
}

interface Props {
  budgetData: BudgetData;
  categories: Category[];
  currencies: CurrencyLite[];
  month: number;
  year: number;
}

function fmt(paisas: number) { return (paisas / 100).toLocaleString(); }
function fmtUsd(cents: number) { return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function useDebouncedSave(callback: () => Promise<void>, deps: unknown[], delay = 900) {
  const isFirstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(callback, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function BudgetClient({ budgetData, categories, currencies, month, year }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const bc of budgetData.categories) {
      init[bc.categoryId] = String(bc.allocatedAmount / 100);
    }
    return init;
  });

  const [savingsAllocs, setSavingsAllocs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sa of budgetData.savingsAllocations) {
      init[sa.potId] = String(sa.amount / 100);
    }
    return init;
  });

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE" || c.type === "BOTH");

  // Live ready-to-assign based on current inputs (in paisas)
  const liveAssigned = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0) * 100, 0);
  const liveSavings = Object.values(savingsAllocs).reduce((sum, v) => sum + (parseFloat(v) || 0) * 100, 0);
  const liveReadyToAssign = budgetData.totalIncome - liveAssigned - liveSavings;

  const hasIncome = budgetData.totalIncome > 0;

  useDebouncedSave(async () => {
    setIsSaving(true);
    const result = await upsertBudget({
      month, year,
      categories: Object.entries(allocations)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([categoryId, v]) => ({ categoryId, allocatedAmount: parseFloat(v) })),
      savingsAllocations: Object.entries(savingsAllocs)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([potId, v]) => ({ potId, amount: parseFloat(v) })),
    });
    setIsSaving(false);
    if (!result.success) toast.error(result.error ?? "Failed to save");
  }, [allocations, savingsAllocs, month, year]);

  function navigate(dir: "prev" | "next") {
    const m = dir === "prev" ? (month === 1 ? 12 : month - 1) : (month === 12 ? 1 : month + 1);
    const y = dir === "prev" ? (month === 1 ? year - 1 : year) : (month === 12 ? year + 1 : year);
    router.push(`/budget?month=${m}&year=${y}`);
  }

  async function handleCopy() {
    startTransition(async () => {
      const result = await copyPreviousMonthBudget(month, year);
      if (result.success) { toast.success("Copied from last month"); router.refresh(); }
      else toast.error(result.error ?? "Failed to copy");
    });
  }

  const [confirmNewMonth, setConfirmNewMonth] = useState(false);
  const upcoming = nextPeriod(month, year);

  function handleStartNewMonth() {
    startTransition(async () => {
      const result = await startNewBudgetPeriod();
      if (result.success && result.period) {
        const surplus = result.reconciledSurplus ?? 0;
        toast.success(
          `Started ${getMonthName(result.period.month)} ${result.period.year}` +
          (surplus > 0 ? ` · ${baseSymbol} ${fmt(surplus)} leftover, now counted as accumulated savings` : ""),
        );
        setConfirmNewMonth(false);
        router.push(`/budget?month=${result.period.month}&year=${result.period.year}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to start new month");
      }
    });
  }

  // Ready to Assign status
  const rtaPositive = liveReadyToAssign > 0;
  const rtaZero = liveReadyToAssign === 0;
  const rtaNegative = liveReadyToAssign < 0;

  return (
    <div className="space-y-6">
      <PageHeader section="Money Flow" title="Budget" />
      {/* Month navigator */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => navigate("prev")}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-semibold text-foreground min-w-[160px] text-center">{getMonthName(month)} {year}</h2>
        <Button variant="outline" size="icon" onClick={() => navigate("next")}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={isPending}>
          <Copy className="h-3.5 w-3.5" />Copy Last Month
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirmNewMonth(true)} disabled={isPending}>
          <CalendarPlus className="h-3.5 w-3.5" />Start New Month
        </Button>
        {isSaving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <Loader2 className="h-3 w-3 animate-spin" />Saving…
          </span>
        )}
      </div>

      {/* ── Ready to Assign ── */}
      {hasIncome && (
        <div className={cn(
          "rounded-xl border px-5 py-4",
          rtaNegative ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700" :
          rtaZero ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" :
          "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
        )}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className={cn("text-xs font-semibold uppercase tracking-widest mb-1",
                rtaNegative ? "text-red-500" : rtaZero ? "text-blue-500" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {rtaNegative ? "Over-assigned" : rtaZero ? "Fully Assigned" : "Ready to Assign"}
              </div>
              <div className={cn("text-3xl font-bold",
                rtaNegative ? "text-red-600 dark:text-red-400" : rtaZero ? "text-blue-600 dark:text-blue-400" : "text-emerald-700 dark:text-emerald-300"
              )}>
                {rtaNegative ? "-" : ""}{baseSymbol} {fmt(Math.abs(liveReadyToAssign))}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                <span>Income {baseSymbol} {fmt(budgetData.totalIncome)}</span>
                <span>·</span>
                <span>Categories {baseSymbol} {fmt(liveAssigned)}</span>
                {liveSavings > 0 && <><span>·</span><span>Savings {baseSymbol} {fmt(liveSavings)}</span></>}
              </div>
            </div>
            {rtaZero && <CheckCircle2 className="h-8 w-8 text-blue-500 shrink-0" />}
            {rtaNegative && <AlertTriangle className="h-8 w-8 text-red-500 shrink-0" />}
          </div>
          {rtaNegative && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
              You&apos;ve assigned more than your income - reduce some allocations or add more income.
            </p>
          )}
        </div>
      )}

      {/* Monthly Summary Cards */}
      {hasIncome && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              <TrendingUp className="h-3.5 w-3.5" />Income
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{baseSymbol} {fmt(budgetData.totalIncome)}</div>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1">
              <PiggyBank className="h-3.5 w-3.5" />Budgeted
            </div>
            <div className="text-xl font-bold text-primary">{baseSymbol} {fmt(liveAssigned)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{expenseCategories.filter((c) => (parseFloat(allocations[c.id] ?? "0") || 0) > 0).length} categories</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium mb-1">
              <TrendingDown className="h-3.5 w-3.5" />Spent
            </div>
            <div className="text-xl font-bold text-red-700 dark:text-red-300">{baseSymbol} {fmt(budgetData.totalSpent)}</div>
          </div>
          {budgetData.unbudgetedTotal > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />Unplanned
              </div>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{baseSymbol} {fmt(budgetData.unbudgetedTotal)}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Savings Plan ── */}
      {budgetData.pots.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-blue-500" />Savings Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan how much income to set aside into each pot this month. Auto-saves as you type.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {budgetData.pots.map((pot) => {
              const allocVal = parseFloat(savingsAllocs[pot.id] ?? "0") || 0;
              const nonBaseBalances = pot.balances.filter((b) => !b.currency.isBase && b.amount > 0);
              const baseBalance = pot.balances.find((b) => b.currency.isBase)?.amount ?? 0;
              const pkrBalance = baseBalance / 100;
              const typeLabel = pot.type === "GOAL" ? "Goal" : pot.type;

              return (
                <div key={pot.id} className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                  "border-border bg-muted/30"
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {pot.name}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{typeLabel}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {nonBaseBalances.length > 0 ? (
                        <span>
                          {nonBaseBalances.map((b) => `${b.currency.symbol} ${fmtUsd(b.amount)}`).join(" + ")} + {baseSymbol} {pkrBalance.toLocaleString()} saved
                        </span>
                      ) : (
                        <span>{baseSymbol} {pkrBalance.toLocaleString()} saved</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{baseSymbol}</span>
                    <Input
                      type="number"
                      value={savingsAllocs[pot.id] ?? ""}
                      onChange={(e) => setSavingsAllocs((prev) => ({ ...prev, [pot.id]: e.target.value }))}
                      placeholder="0"
                      className="h-8 w-28 text-sm text-right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Category Budgets ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground">Spending Categories</h3>
          <span className="text-xs text-muted-foreground">Auto-saves as you type</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Assign income to spending categories. <span className="font-medium">Available</span> = last month&apos;s leftover + assigned − spent.
        </p>
        {liveAssigned > 0 && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-lg px-4 py-2.5 mb-4">
            <span className="text-sm font-medium text-foreground">Total budgeted across all categories</span>
            <span className="text-sm font-bold text-primary">{baseSymbol} {fmt(liveAssigned)}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {expenseCategories.map((cat) => {
            const allocRupees = parseFloat(allocations[cat.id] ?? "0") || 0;
            const allocPaisas = allocRupees * 100;
            const spentPaisas = budgetData.spendingByCategory[cat.id] ?? 0;
            const budgetCat = budgetData.categories.find((bc) => bc.categoryId === cat.id);
            const available = allocPaisas - spentPaisas;
            const pct = allocPaisas > 0 ? Math.round((spentPaisas / allocPaisas) * 100) : 0;

            return (
              <div key={cat.id} className={cn(
                "border rounded-lg p-3 space-y-2",
                available < 0 ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20" : "border-border"
              )}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                </div>
                <Input
                  type="number"
                  value={allocations[cat.id] ?? ""}
                  onChange={(e) => setAllocations((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
                {allocPaisas > 0 ? (
                  <div className="space-y-1">
                    <Progress
                      value={Math.min(pct, 100)}
                      className={cn("h-1.5",
                        pct > 100 ? "[&>div]:bg-red-500" :
                        pct === 100 ? "[&>div]:bg-blue-500" :
                        pct >= 75 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                      )}
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{baseSymbol} {(spentPaisas / 100).toLocaleString()} spent</span>
                      <span className={cn("font-medium",
                        pct > 100 ? "text-red-500" : pct === 100 ? "text-blue-500" : pct >= 75 ? "text-amber-500" : "text-muted-foreground"
                      )}>{pct}%</span>
                    </div>
                    {/* Available balance */}
                    <div className={cn("text-xs font-medium",
                      available > 0 ? "text-emerald-600 dark:text-emerald-400" :
                      available === 0 ? "text-muted-foreground" : "text-red-500"
                    )}>
                      {available > 0 ? `${baseSymbol} ${fmt(available)} available` :
                       available === 0 ? "Fully spent" :
                       `${baseSymbol} ${fmt(Math.abs(available))} overspent`}
                    </div>
                  </div>
                ) : spentPaisas > 0 ? (
                  <span className="text-xs text-amber-600 font-medium block">
                    {baseSymbol} {(spentPaisas / 100).toLocaleString()} unbudgeted
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unplanned expenses */}
      {budgetData.unbudgetedExpenses.length > 0 && (
        <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />Unplanned Expenses
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                No budget allocation for these categories - spending here directly reduces your savings
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-lg font-bold text-amber-600">-{baseSymbol} {fmt(budgetData.unbudgetedTotal)}</div>
              <div className="text-xs text-muted-foreground">from savings</div>
            </div>
          </div>
          <div className="space-y-2">
            {budgetData.unbudgetedExpenses.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tx.category.color }} />
                <span className="text-sm text-foreground flex-1">{tx.description}</span>
                <span className="text-xs text-muted-foreground">{tx.category.name}</span>
                <span className="text-sm font-semibold text-red-600">-{baseSymbol} {fmt(tx.amount)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            Tip: Add budget allocations for these categories to plan for them next month.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmNewMonth}
        onOpenChange={setConfirmNewMonth}
        title="Start new budget month?"
        description={`New income and expenses will be filed under ${getMonthName(upcoming.month)} ${upcoming.year} from now on - regardless of the calendar date. Do this when your salary for the new month arrives.`}
        confirmLabel="Start New Month"
        onConfirm={handleStartNewMonth}
        loading={isPending}
      />
    </div>
  );
}
