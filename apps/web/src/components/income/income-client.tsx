"use client";

import { useState, useCallback } from "react";
import { Plus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { TransactionList } from "@/components/expenses/transaction-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PeriodFilterBar, usePeriodFilter } from "@/components/shared/period-filter";
import { PageHeader } from "@/components/shared/page-header";
import { useAddShortcut } from "@/lib/use-add-shortcut";
import type { QuickPicks } from "@/actions/expenses";
import { formatAmount as fmt } from "@/lib/currency-utils";

interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
interface Transaction {
  id: string; amount: number; type: string; categoryId: string; description: string;
  notes?: string | null; date: Date; budgetMonth: number; budgetYear: number; tags: string; isRecurring: boolean;
  recurringFrequency?: string | null;
  nativeCurrencyId?: string | null; nativeAmount?: number | null; nativeCurrency?: CurrencyLite | null;
  category: { id: string; name: string; color: string; icon: string };
}
interface Category { id: string; name: string; icon: string; color: string; type: string; }


export function IncomeClient({
  transactions,
  categories,
  currencies = [],
  dateFormat = "dd/MM/yyyy",
  thisMonthIncome = 0,
  monthlyAvailable = 0,
  currentPeriod,
  lastPeriod,
  quickPicks,
}: {
  transactions: Transaction[];
  categories: Category[];
  currencies?: CurrencyLite[];
  dateFormat?: string;
  thisMonthIncome?: number;
  monthlyAvailable?: number;
  currentPeriod: { month: number; year: number };
  lastPeriod: { month: number; year: number };
  quickPicks?: QuickPicks;
}) {
  const [open, setOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const openNew = useCallback(() => { setEditingTx(null); setOpen(true); }, []);
  useAddShortcut(open, openNew);
  const filter = usePeriodFilter(transactions, currentPeriod, lastPeriod);

  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  const incomeCategories = categories.filter((c) => c.type === "INCOME" || c.type === "BOTH");

  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  const nativeTransactions = transactions.filter((t) => t.nativeCurrencyId);
  const baseOnlyIncome = totalIncome - nativeTransactions.reduce((s, t) => s + t.amount, 0);
  // Group non-base income by currency, e.g. multiple USD entries + an EUR entry stay separate.
  const nativeTotals = new Map<string, { currency: CurrencyLite; nativeTotal: number; baseTotal: number }>();
  for (const t of nativeTransactions) {
    if (!t.nativeCurrency) continue;
    const entry = nativeTotals.get(t.nativeCurrency.id) ?? { currency: t.nativeCurrency, nativeTotal: 0, baseTotal: 0 };
    entry.nativeTotal += t.nativeAmount ?? 0;
    entry.baseTotal += t.amount;
    nativeTotals.set(t.nativeCurrency.id, entry);
  }
  const nativeBreakdown = [...nativeTotals.values()];

  const allocated = Math.max(0, thisMonthIncome - monthlyAvailable);

  return (
    <>
      <PageHeader section="Money Flow" title="Income" />
      <div className="space-y-6">

        {/* This period summary cards */}
        <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">This Month</p>
            <div className="text-xl font-bold text-foreground tabnum">{baseSymbol} {fmt(thisMonthIncome)}</div>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">Allocated</p>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabnum">{baseSymbol} {fmt(allocated)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">expenses + deposits</div>
          </div>
          <div className="bg-card px-5 py-4">
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5", monthlyAvailable >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              Available
            </p>
            <div className={cn("text-xl font-bold tabnum", monthlyAvailable >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {baseSymbol} {fmt(Math.abs(monthlyAvailable))}
            </div>
            {monthlyAvailable < 0 && <div className="text-xs text-red-500 mt-0.5">over-allocated</div>}
          </div>
        </div>

        {/* All-time summary + Add button */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {nativeBreakdown.length > 0 ? (
          <div className="grid gap-px bg-border rounded-xl overflow-hidden border border-border"
            style={{ gridTemplateColumns: `repeat(${nativeBreakdown.length + (baseOnlyIncome > 0 ? 1 : 0)}, minmax(0,1fr))` }}>
            {nativeBreakdown.map(({ currency, nativeTotal, baseTotal }) => (
              <div key={currency.id} className="bg-card px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                  <DollarSign className="h-2.5 w-2.5" />{currency.code}
                </p>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 tabnum">{currency.symbol} {(nativeTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-xs text-muted-foreground mt-0.5">≈ {baseSymbol} {(baseTotal / 100).toLocaleString()}</div>
              </div>
            ))}
            {nativeBreakdown.length > 0 && baseOnlyIncome > 0 && (
              <div className="bg-card px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">Other income</p>
                <div className="text-xl font-bold text-foreground tabnum">{baseSymbol} {(baseOnlyIncome / 100).toLocaleString()}</div>
              </div>
            )}
          </div>
          ) : <div />}
          <Button title="Add income (Press N)" onClick={() => { setEditingTx(null); setOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />Add Income
          </Button>
        </div>

        <PeriodFilterBar filter={filter} categories={incomeCategories} total={transactions.length} searchPlaceholder="Search income..." />

        <TransactionList
          transactions={filter.filtered}
          baseSymbol={baseSymbol}
          onEdit={(tx) => { setEditingTx(tx); setOpen(true); }}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-lg"
          onEscapeKeyDown={(e) => { if (formDirty) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (formDirty) e.preventDefault(); }}
          onInteractOutside={(e) => { if (formDirty) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>{editingTx ? "Edit income" : "Add income"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            defaultType="INCOME"
            categories={incomeCategories}
            transaction={editingTx}
            dateFormat={dateFormat}
            currencies={currencies}
            currentPeriod={currentPeriod}
            quickPicks={quickPicks}
            onDirtyChange={setFormDirty}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
