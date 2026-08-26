"use client";

import { useState, useMemo } from "react";
import { Plus, Search, X, Filter, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { TransactionList } from "@/components/expenses/transaction-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { RecurringIncomeCard } from "@/components/income/recurring-income-card";

interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
interface RecurringIncome {
  id: string; label: string; kind: string; amount: number; variable: boolean;
  countsTowardFloor: boolean; dayOfMonth: number | null; startDate: Date; endDate: Date | null; active: boolean;
  occurrences: { month: number; year: number }[];
}
interface Transaction {
  id: string; amount: number; type: string; categoryId: string; description: string;
  notes?: string | null; date: Date; budgetMonth: number; budgetYear: number; tags: string; isRecurring: boolean;
  recurringFrequency?: string | null;
  nativeCurrencyId?: string | null; nativeAmount?: number | null; nativeCurrency?: CurrencyLite | null;
  category: { id: string; name: string; color: string; icon: string };
}
interface Category { id: string; name: string; icon: string; color: string; type: string; }

const THIS_PERIOD = "THIS_PERIOD";
const LAST_PERIOD = "LAST_PERIOD";
const CUSTOM = "CUSTOM";

const fmt = (n: number) => (n / 100).toLocaleString();

export function IncomeClient({
  transactions,
  categories,
  currencies = [],
  dateFormat = "dd/MM/yyyy",
  thisMonthIncome = 0,
  monthlyAvailable = 0,
  currentPeriod,
  lastPeriod,
  recurringIncomes,
}: {
  transactions: Transaction[];
  categories: Category[];
  currencies?: CurrencyLite[];
  dateFormat?: string;
  thisMonthIncome?: number;
  monthlyAvailable?: number;
  currentPeriod: { month: number; year: number };
  lastPeriod: { month: number; year: number };
  recurringIncomes: RecurringIncome[];
}) {
  const [open, setOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterPeriod, setFilterPeriod] = useState(THIS_PERIOD);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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
  const allocated = Math.max(0, thisMonthIncome - monthlyAvailable);

  return (
    <>
      <PageHeader section="Money Flow" title="Income" />
      <div className="space-y-6">

        <RecurringIncomeCard
          incomes={recurringIncomes}
          baseSymbol={baseSymbol}
          categories={incomeCategories}
          currentPeriod={currentPeriod}
          dateFormat={dateFormat}
        />

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
          <div className="grid gap-px bg-border rounded-xl overflow-hidden border border-border"
            style={{ gridTemplateColumns: `repeat(${1 + nativeBreakdown.length + (nativeBreakdown.length > 0 && baseOnlyIncome > 0 ? 1 : 0)}, minmax(0,1fr))` }}>
            <div className="bg-card px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">Total Income (all time)</p>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabnum">{baseSymbol} {(totalIncome / 100).toLocaleString()}</div>
            </div>
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
          <Button onClick={() => { setEditingTx(null); setOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />Add Income
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search income..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-36 h-9">
                  <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {incomeCategories.map((c) => (
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
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={THIS_PERIOD}>This month</SelectItem>
                  <SelectItem value={LAST_PERIOD}>Last month</SelectItem>
                  <SelectItem value={CUSTOM}>Custom range…</SelectItem>
                  <SelectItem value="ALL">All time</SelectItem>
                  {periodOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {isFiltered && (
                <Button size="sm" variant="ghost" className="h-9" onClick={() => { setSearch(""); setFilterCategory("ALL"); setFilterPeriod(THIS_PERIOD); setCustomStart(""); setCustomEnd(""); }}>
                  <X className="h-3.5 w-3.5" />Clear
                </Button>
              )}
            </div>
          </div>
          {filterPeriod === CUSTOM && (
            <div className="flex items-center gap-2">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 text-sm w-36" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 text-sm w-36" />
            </div>
          )}
        </div>

        {isFiltered && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {transactions.length}</span>
            {filterCategory !== "ALL" && <Badge variant="outline" className="text-xs">{incomeCategories.find((c) => c.id === filterCategory)?.name}</Badge>}
            {filterPeriod !== "ALL" && filterPeriod !== THIS_PERIOD && filterPeriod !== LAST_PERIOD && filterPeriod !== CUSTOM && (
              <Badge variant="outline" className="text-xs">{periodOptions.find((m) => m.value === filterPeriod)?.label}</Badge>
            )}
          </div>
        )}

        <TransactionList
          transactions={filtered}
          baseSymbol={baseSymbol}
          onEdit={(tx) => { setEditingTx(tx); setOpen(true); }}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTx ? "Edit Income" : "Add Income"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            defaultType="INCOME"
            categories={incomeCategories}
            transaction={editingTx}
            dateFormat={dateFormat}
            currencies={currencies}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
