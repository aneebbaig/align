"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
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
  recurringFrequency?: string | null; isRegretPurchase?: boolean;
  fundingSource?: string; fundingPotId?: string | null; fundingCurrencyId?: string | null; fundingAmount?: number | null;
  fundingCurrency?: CurrencyLite | null;
  fundingPot?: { id: string; name: string; type: string } | null;
  category: { id: string; name: string; color: string; icon: string };
}
interface Category { id: string; name: string; icon: string; color: string; type: string; }
interface FundingContext {
  monthlyIncomeAvailable: number;
  currencies: CurrencyLite[];
  pots: { id: string; name: string; type: string; balances: { amount: number; currency: CurrencyLite }[] }[];
}


export function ExpensesClient({
  transactions,
  categories,
  budgetByCategoryId = {},
  fundingContext,
  dateFormat = "dd/MM/yyyy",
  currentPeriod,
  lastPeriod,
  thisMonthSpent = 0,
  incomeLeftThisMonth = 0,
  quickPicks,
}: {
  transactions: Transaction[];
  categories: Category[];
  budgetByCategoryId?: Record<string, { allocated: number; spent: number }>;
  fundingContext: FundingContext;
  dateFormat?: string;
  currentPeriod: { month: number; year: number };
  lastPeriod: { month: number; year: number };
  thisMonthSpent?: number;
  incomeLeftThisMonth?: number;
  quickPicks?: QuickPicks;
}) {
  const [open, setOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const openNew = useCallback(() => { setEditingTx(null); setOpen(true); }, []);
  useAddShortcut(open, openNew);
  const filter = usePeriodFilter(transactions, currentPeriod, lastPeriod);

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE" || c.type === "BOTH");
  const baseSymbol = fundingContext.currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  const monthlyIncomeAvailable = fundingContext.monthlyIncomeAvailable;

  return (
    <>
      <PageHeader
        section="Money Flow"
        title="Expenses"
        action={
          <Button title="Add expense (Press N)" onClick={() => { setEditingTx(null); setOpen(true); }}>
            <Plus className="h-4 w-4" />Add Expense
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Summary cards - always current period */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">This month</p>
            <div className="text-xl font-bold text-red-500 dark:text-red-400 tabnum">{baseSymbol} {fmt(thisMonthSpent)}</div>
          </div>
          <div className="bg-card px-5 py-4">
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5",
              incomeLeftThisMonth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              Left this month
            </p>
            <div className={cn("text-xl font-bold tabnum",
              incomeLeftThisMonth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {incomeLeftThisMonth < 0 ? "−" : ""}{baseSymbol} {fmt(Math.abs(incomeLeftThisMonth))}
            </div>
            {incomeLeftThisMonth < 0 && <div className="text-xs text-red-500 mt-0.5">more than this month’s income</div>}
          </div>
          <div className="bg-card px-5 py-4">
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5",
              monthlyIncomeAvailable >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              All-time income savings
            </p>
            <div className={cn("text-xl font-bold tabnum",
              monthlyIncomeAvailable >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {monthlyIncomeAvailable < 0 ? "−" : ""}{baseSymbol} {fmt(Math.abs(monthlyIncomeAvailable))}
            </div>
            {monthlyIncomeAvailable < 0 && <div className="text-xs text-red-500 mt-0.5">more than your income savings</div>}
          </div>
        </div>

        <PeriodFilterBar filter={filter} categories={expenseCategories} total={transactions.length} />

        <TransactionList
          transactions={filter.filtered}
          budgetByCategoryId={budgetByCategoryId}
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
            <DialogTitle>{editingTx ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            defaultType="EXPENSE"
            categories={expenseCategories}
            transaction={editingTx}
            budgetByCategoryId={budgetByCategoryId}
            currencies={fundingContext.currencies}
            fundingContext={fundingContext}
            currentPeriod={currentPeriod}
            dateFormat={dateFormat}
            quickPicks={quickPicks}
            onDirtyChange={setFormDirty}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
