"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeddingPlan, CurrencyLite, EVENT_TYPES, VENDOR_CATEGORIES, fmt, fmtSource, getEventInfo, getCategoryLabel } from "./wedding-types";

export function WeddingBudgetTab({ plan, baseSymbol = "Rs" }: { plan: WeddingPlan; baseSymbol?: string }) {
  const totalBudget = plan.totalBudget;

  // Vendor costs (selected vendors only for "committed" view)
  const selectedVendors = plan.vendors.filter((v) => v.isSelected);
  const totalVendorCommitted = selectedVendors.reduce((s, v) => s + (v.finalAmount ?? v.quotedAmount), 0);
  const totalVendorPaid = plan.vendors
    .filter((v) => v.paymentStatus === "FULLY_PAID")
    .reduce((s, v) => s + (v.finalAmount ?? v.quotedAmount), 0);
  const totalDeposit = plan.vendors
    .filter((v) => v.paymentStatus === "DEPOSIT_PAID")
    .reduce((s, v) => s + (v.depositPaid ?? 0), 0);

  // Expense costs grouped by currency (can't add across currencies)
  const expenseTotalsByCurrency = new Map<string, { currency: CurrencyLite; amount: number }>();
  const addExpenseTotal = (currency: CurrencyLite, amount: number) => {
    const entry = expenseTotalsByCurrency.get(currency.id) ?? { currency, amount: 0 };
    entry.amount += amount;
    expenseTotalsByCurrency.set(currency.id, entry);
  };
  for (const e of plan.expenses) {
    addExpenseTotal(e.source1Currency, e.source1Amount);
    if (e.source2Currency && e.source2Amount) addExpenseTotal(e.source2Currency, e.source2Amount);
  }
  const totalExpenseBase = [...expenseTotalsByCurrency.values()].find((t) => t.currency.isBase)?.amount ?? 0;
  const otherExpenseTotals = [...expenseTotalsByCurrency.values()].filter((t) => !t.currency.isBase);
  const totalExpensePaidCount = plan.expenses.filter((e) => e.isPaid).length;

  // Combined base-currency committed (vendors + base-currency expenses); other currencies shown separately
  const totalSelected = totalVendorCommitted + totalExpenseBase;
  const totalPaid = totalVendorPaid;
  const remaining = totalBudget - totalSelected;
  const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((totalSelected / totalBudget) * 100)) : 0;
  const paidPct = totalSelected > 0 ? Math.min(100, Math.round((totalPaid / totalSelected) * 100)) : 0;

  // By category (all vendors, not just selected)
  const byCat = VENDOR_CATEGORIES.map((cat) => {
    const vendors = plan.vendors.filter((v) => v.category === cat.value);
    const selected = vendors.find((v) => v.isSelected);
    const totalQuoted = vendors.reduce((s, v) => s + v.quotedAmount, 0);
    const committed = selected ? (selected.finalAmount ?? selected.quotedAmount) : 0;
    const paid = vendors
      .filter((v) => v.paymentStatus === "FULLY_PAID")
      .reduce((s, v) => s + (v.finalAmount ?? v.quotedAmount), 0);
    return { cat, vendors, selected, totalQuoted, committed, paid };
  }).filter((c) => c.vendors.length > 0);

  // By event (using budgetAllocated)
  const byEvent = EVENT_TYPES.map((et) => {
    const event = plan.events.find((e) => e.type === et.value);
    if (!event) return null;
    return { et, event };
  }).filter(Boolean) as { et: (typeof EVENT_TYPES)[number]; event: typeof plan.events[number] }[];

  const totalEventBudget = byEvent.reduce((s, { event }) => s + event.budgetAllocated, 0);

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
          <p className="text-xl font-bold">{fmt(totalBudget, baseSymbol)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Committed ({baseSymbol})</p>
          <p className={cn("text-xl font-bold", totalSelected > totalBudget ? "text-rose-500" : "text-foreground")}>
            {fmt(totalSelected, baseSymbol)}
          </p>
          {totalBudget > 0 && <p className="text-xs text-muted-foreground mt-0.5">{budgetPct}% of budget</p>}
          {otherExpenseTotals.map(({ currency, amount }) => (
            <p key={currency.id} className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              + {fmt(amount, currency.symbol)} {currency.code}
            </p>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 p-4">
          <p className="text-xs text-muted-foreground mb-1">Paid So Far</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalPaid, baseSymbol)}</p>
          {totalSelected > 0 && <p className="text-xs text-muted-foreground mt-0.5">{paidPct}% of committed</p>}
        </div>
        <div className={cn("rounded-xl border p-4", remaining < 0 ? "border-rose-200 bg-rose-50 dark:bg-rose-950/30" : "border-border bg-card")}>
          <p className="text-xs text-muted-foreground mb-1">{remaining >= 0 ? "Remaining" : "Over budget"}</p>
          <div className="flex items-center gap-1">
            {remaining < 0 ? <TrendingDown className="h-4 w-4 text-rose-500" /> : <TrendingUp className="h-4 w-4 text-emerald-500" />}
            <p className={cn("text-xl font-bold", remaining < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400")}>
              {fmt(Math.abs(remaining), baseSymbol)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bars */}
      {totalBudget > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Budget committed</span>
              <span className="font-medium">{budgetPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", budgetPct > 100 ? "bg-rose-400" : "bg-primary")}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
          </div>
          {totalSelected > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Amount paid</span>
                <span className="font-medium">{paidPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* By vendor category */}
      {byCat.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">By Category</h3>
          <div className="space-y-2">
            {byCat.map(({ cat, vendors, selected, committed, paid }) => (
              <div key={cat.value} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-xs text-muted-foreground">({vendors.length} vendor{vendors.length !== 1 ? "s" : ""})</span>
                  </div>
                  {selected && (
                    <p className="text-xs text-muted-foreground truncate">Selected: {selected.name}</p>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  {committed > 0 ? (
                    <p className="font-semibold">{fmt(committed, baseSymbol)}</p>
                  ) : (
                    <p className="text-muted-foreground text-xs">No selection</p>
                  )}
                  {paid > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">{fmt(paid, baseSymbol)} paid</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Misc expenses summary */}
      {plan.expenses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Misc Expenses</h3>
          <div className="space-y-2">
            {plan.expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 text-sm">
                <div>
                  <span className="font-medium">{exp.name}</span>
                  {exp.isPaid && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">paid</span>}
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="font-semibold">{fmtSource(exp.source1Currency, exp.source1Amount)}</p>
                  {exp.source2Currency && exp.source2Amount != null && (
                    <p className="text-xs text-muted-foreground">
                      + {fmtSource(exp.source2Currency, exp.source2Amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40 text-sm font-semibold">
              <span>Misc Total</span>
              <span className="space-x-2">
                {[...expenseTotalsByCurrency.values()].map(({ currency, amount }) => (
                  <span key={currency.id} className={currency.isBase ? "" : "text-blue-600 dark:text-blue-400"}>
                    {fmt(amount, currency.symbol)}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* By event */}
      {byEvent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Event Budgets</h3>
          <div className="space-y-2">
            {byEvent.map(({ et, event }) => {
              const pct = totalEventBudget > 0 ? Math.round((event.budgetAllocated / totalEventBudget) * 100) : 0;
              return (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 text-sm">
                  <span className="text-lg">{et.emoji}</span>
                  <div className="flex-1">
                    <span className="font-medium">{event.name}</span>
                    {pct > 0 && (
                      <div className="mt-1 h-1 bg-muted rounded-full">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {event.budgetAllocated > 0 ? (
                      <p className="font-semibold">{fmt(event.budgetAllocated, baseSymbol)}</p>
                    ) : (
                      <p className="text-muted-foreground text-xs">No budget set</p>
                    )}
                    {pct > 0 && <p className="text-xs text-muted-foreground">{pct}% of events total</p>}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40 text-sm font-semibold">
              <span>Total Event Budgets</span>
              <span>{fmt(totalEventBudget, baseSymbol)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
