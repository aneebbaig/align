"use client";

import { useState, useMemo } from "react";
import { Plus, Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { TransactionList } from "@/components/expenses/transaction-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { PlannedExpensesCard } from "@/components/expenses/planned-expenses-card";

interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
interface PlannedExpense {
  id: string; name: string; amount: number; dueDate: Date; flexibility: string;
  priority: number; slideWindowMonths: number; status: string; notes: string | null;
  categoryId: string | null;
}
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

const THIS_PERIOD = "THIS_PERIOD";
const LAST_PERIOD = "LAST_PERIOD";
const CUSTOM = "CUSTOM";

const fmt = (n: number) => (n / 100).toLocaleString();

export function ExpensesClient({
  transactions,
  categories,
  budgetByCategoryId = {},
  fundingContext,
  dateFormat = "dd/MM/yyyy",
  currentPeriod,
  lastPeriod,
  thisMonthSpent = 0,
  budgetTotal = 0,
  plannedExpenses,
}: {
  transactions: Transaction[];
  categories: Category[];
  budgetByCategoryId?: Record<string, { allocated: number; spent: number }>;
  fundingContext: FundingContext;
  dateFormat?: string;
  currentPeriod: { month: number; year: number };
  lastPeriod: { month: number; year: number };
  thisMonthSpent?: number;
  budgetTotal?: number;
  plannedExpenses: PlannedExpense[];
}) {
  const [open, setOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterPeriod, setFilterPeriod] = useState(THIS_PERIOD);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE" || c.type === "BOTH");
  const baseSymbol = fundingContext.currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  const periodKey = (m: number, y: number) => `${y}-${String(m).padStart(2, "0")}`;
  const currentKey = periodKey(currentPeriod.month, currentPeriod.year);
  const lastKey = periodKey(lastPeriod.month, lastPeriod.year);

  const periodOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const t of transactions) {
      const key = periodKey(t.budgetMonth, t.budgetYear);
      if (!seen.has(key)) {
        seen.add(key);
        const label = new Date(t.budgetYear, t.budgetMonth - 1).toLocaleString("default", { month: "long", year: "numeric" });
        opts.push({ value: key, label });
      }
    }
    return opts.sort((a, b) => b.value.localeCompare(a.value));
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const key = periodKey(t.budgetMonth, t.budgetYear);

      if (filterPeriod === THIS_PERIOD) {
        if (key !== currentKey) return false;
      } else if (filterPeriod === LAST_PERIOD) {
        if (key !== lastKey) return false;
      } else if (filterPeriod === CUSTOM) {
        const d = new Date(t.date);
        if (customStart && d < new Date(customStart)) return false;
        if (customEnd && d > new Date(customEnd + "T23:59:59.999")) return false;
      } else if (filterPeriod !== "ALL") {
        if (key !== filterPeriod) return false;
      }

      if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.category.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== "ALL" && t.categoryId !== filterCategory) return false;
      return true;
    });
  }, [transactions, search, filterCategory, filterPeriod, customStart, customEnd, currentKey, lastKey]);

  const isFiltered = !!(search || filterCategory !== "ALL" || filterPeriod !== THIS_PERIOD);

  function clearFilters() {
    setSearch(""); setFilterCategory("ALL"); setFilterPeriod(THIS_PERIOD); setCustomStart(""); setCustomEnd("");
  }

  const overUnder = budgetTotal - thisMonthSpent;

  return (
    <>
      <PageHeader
        section="Money Flow"
        title="Expenses"
        action={
          <Button onClick={() => { setEditingTx(null); setOpen(true); }}>
            <Plus className="h-4 w-4" />Add Expense
          </Button>
        }
      />

      <div className="space-y-6">
        <PlannedExpensesCard
          expenses={plannedExpenses}
          baseSymbol={baseSymbol}
          categories={expenseCategories}
          fundingContext={fundingContext}
          currentPeriod={currentPeriod}
          dateFormat={dateFormat}
        />

        {/* Summary cards - always current period */}
        <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">This Month</p>
            <div className="text-xl font-bold text-red-500 dark:text-red-400 tabnum">{baseSymbol} {fmt(thisMonthSpent)}</div>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">Budget</p>
            <div className="text-xl font-bold text-foreground tabnum">{budgetTotal > 0 ? `${baseSymbol} ${fmt(budgetTotal)}` : "-"}</div>
            {budgetTotal === 0 && <div className="text-xs text-muted-foreground mt-0.5">Not set</div>}
          </div>
          <div className="bg-card px-5 py-4">
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5",
              budgetTotal === 0 ? "text-muted-foreground/60" : overUnder >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {budgetTotal === 0 ? "Remaining" : overUnder >= 0 ? "Under Budget" : "Over Budget"}
            </p>
            <div className={cn("text-xl font-bold tabnum",
              budgetTotal === 0 ? "text-muted-foreground" : overUnder >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {budgetTotal === 0 ? "-" : `${baseSymbol} ${fmt(Math.abs(overUnder))}`}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input className="pl-9 h-8 text-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <Filter className="h-3 w-3 mr-1 text-muted-foreground/50" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={(v) => { setFilterPeriod(v); if (v !== CUSTOM) { setCustomStart(""); setCustomEnd(""); } }}>
              <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={THIS_PERIOD}>This month</SelectItem>
                <SelectItem value={LAST_PERIOD}>Last month</SelectItem>
                <SelectItem value={CUSTOM}>Custom range…</SelectItem>
                <SelectItem value="ALL">All time</SelectItem>
                {periodOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {isFiltered && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8 px-2 text-muted-foreground/60 hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {filterPeriod === CUSTOM && (
            <div className="flex items-center gap-2">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8 text-sm w-36" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8 text-sm w-36" />
            </div>
          )}
        </div>

        {isFiltered && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground -mt-3">
            <span>Showing {filtered.length} of {transactions.length}</span>
            {filterCategory !== "ALL" && <Badge variant="outline" className="text-xs">{expenseCategories.find((c) => c.id === filterCategory)?.name}</Badge>}
            {filterPeriod !== "ALL" && filterPeriod !== THIS_PERIOD && filterPeriod !== LAST_PERIOD && filterPeriod !== CUSTOM && (
              <Badge variant="outline" className="text-xs">{periodOptions.find((m) => m.value === filterPeriod)?.label}</Badge>
            )}
          </div>
        )}

        <TransactionList
          transactions={filtered}
          budgetByCategoryId={budgetByCategoryId}
          baseSymbol={baseSymbol}
          onEdit={(tx) => { setEditingTx(tx); setOpen(true); }}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTx ? "Edit Expense" : "Add Expense"}</DialogTitle>
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
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
